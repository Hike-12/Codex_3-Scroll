import { describe, expect, it } from "vitest";
import { analyzePlan, recommendIndex } from "./planAnalyzer";
describe("plan analyzer", () => {
  it("classifies scans, indexed lookups, covering indexes and temp sorts", () => {
    const n = analyzePlan(
      [
        { id: 0, parent: 0, detail: "SCAN orders" },
        {
          id: 1,
          parent: 0,
          detail: "SEARCH users USING INDEX idx_users_email (email=?)",
        },
        {
          id: 2,
          parent: 0,
          detail:
            "SEARCH products USING COVERING INDEX idx_product (category=?)",
        },
        { id: 3, parent: 0, detail: "USE TEMP B-TREE FOR ORDER BY" },
      ],
      { orders: 100 },
    );
    expect(n.map((x) => x.severity)).toEqual([
      "slow",
      "fast",
      "fast",
      "warning",
    ]);
    expect(n[2].explanation).toMatch(/avoids/);
  });
  it("suggests a valid filter index", () =>
    expect(
      recommendIndex("SELECT * FROM orders WHERE customer_id = 4", [
        { name: "orders", columns: ["id", "customer_id", "status"] },
      ]),
    ).toBe("CREATE INDEX idx_orders_customer_id ON orders(customer_id);"));
  it("suggests a join key index using the table alias", () =>
    expect(
      recommendIndex(
        "SELECT * FROM orders o JOIN customers c ON c.id = o.customer_id",
        [
          { name: "orders", columns: ["id", "customer_id"] },
          { name: "customers", columns: ["id", "email"] },
        ],
      ),
    ).toBe("CREATE INDEX idx_orders_customer_id ON orders(customer_id);"));
});
