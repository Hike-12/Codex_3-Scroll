import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";
let SQL: SqlJsStatic | undefined;
export async function createDatabase(file?: Uint8Array): Promise<Database> {
  SQL ??= await initSqlJs({
    locateFile: () => wasmUrl,
    useOldExtensionFunctions: false,
  });
  return new SQL.Database(file);
}
export interface QueryResult {
  columns: string[];
  values: unknown[][];
  plan: Array<{ id: number; parent: number; detail: string }>;
  instructions: number;
  time: number;
}
export function runQuery(db: Database, sql: string): QueryResult {
  const start = performance.now(),
    normalized = sql.trim().replace(/;\s*$/, "");
  const readable = /^\s*(select|with)\b/i.test(normalized);
  const plan = readable
    ? (db.exec(`EXPLAIN QUERY PLAN ${normalized}`)[0]?.values.map((r) => ({
        id: Number(r[0]),
        parent: Number(r[1]),
        detail: String(r[3]),
      })) ?? [])
    : [];
  const instructions = readable
    ? (db.exec(`EXPLAIN ${normalized}`)[0]?.values.length ?? 0)
    : 0;
  const results = db.exec(normalized),
    result = results[0];
  return {
    columns: result?.columns ?? [],
    values: result?.values ?? [],
    plan,
    instructions,
    time: performance.now() - start,
  };
}
export function getSchema(db: Database) {
  const tables =
    db.exec(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    )[0]?.values ?? [];
  return tables.map(([name]) => {
    const table = String(name),
      q = table.replaceAll('"', '""'),
      columns = db.exec(`PRAGMA table_info("${q}")`)[0]?.values ?? [],
      indexes = db.exec(`PRAGMA index_list("${q}")`)[0]?.values ?? [],
      count = db.exec(`SELECT COUNT(*) FROM "${q}"`)[0]?.values[0]?.[0] ?? 0;
    return {
      name: table,
      columns: columns.map((c) => ({
        name: String(c[1]),
        type: String(c[2]),
        pk: Number(c[5]) > 0,
      })),
      indexes: indexes.map((i) => ({
        name: String(i[1]),
        unique: Number(i[2]) > 0,
        columns: (
          db.exec(
            `PRAGMA index_info("${String(i[1]).replaceAll('"', '""')}")`,
          )[0]?.values ?? []
        ).map((c) => String(c[2])),
      })),
      count: Number(count),
    };
  });
}
export function seedEcommerce(db: Database) {
  db.run(
    `CREATE TABLE IF NOT EXISTS customers(id INTEGER PRIMARY KEY, name TEXT, email TEXT, city TEXT);CREATE TABLE IF NOT EXISTS products(id INTEGER PRIMARY KEY, name TEXT, category TEXT, price REAL);CREATE TABLE IF NOT EXISTS orders(id INTEGER PRIMARY KEY, customer_id INTEGER, status TEXT, total REAL, created_at TEXT);CREATE TABLE IF NOT EXISTS order_items(id INTEGER PRIMARY KEY, order_id INTEGER, product_id INTEGER, quantity INTEGER);`,
  );
  if (Number(db.exec("SELECT COUNT(*) FROM orders")[0]?.values[0]?.[0] ?? 0))
    return;
  const cities = [
      "Portland",
      "Copenhagen",
      "Kyoto",
      "Lisbon",
      "Melbourne",
      "Austin",
      "Oslo",
      "Montreal",
    ],
    categories = ["Home", "Outdoor", "Clothing", "Electronics", "Books"],
    statuses = [
      "delivered",
      "delivered",
      "delivered",
      "shipped",
      "processing",
      "cancelled",
    ];
  db.run("BEGIN");
  const cust = db.prepare("INSERT INTO customers VALUES(?,?,?,?)");
  for (let i = 1; i <= 10000; i++)
    cust.run([
      i,
      `Customer ${String(i).padStart(4, "0")}`,
      `customer${i}@example.com`,
      cities[i % cities.length],
    ]);
  cust.free();
  const prod = db.prepare("INSERT INTO products VALUES(?,?,?,?)");
  for (let i = 1; i <= 2000; i++)
    prod.run([
      i,
      `${["Everyday", "Studio", "Field", "Modern"][i % 4]} ${["bottle", "lamp", "bag", "notebook", "chair"][i % 5]}`,
      categories[i % 5],
      Number((8 + ((i * 37) % 220) + 0.99).toFixed(2)),
    ]);
  prod.free();
  const order = db.prepare("INSERT INTO orders VALUES(?,?,?,?,?)"),
    n = 40000;
  for (let i = 1; i <= n; i++)
    order.run([
      i,
      ((i * 17) % 10000) + 1,
      statuses[i % 6],
      Number((24.99 + ((i * 19) % 450)).toFixed(2)),
      `2025-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
    ]);
  order.free();
  const item = db.prepare("INSERT INTO order_items VALUES(?,?,?,?)");
  for (let i = 1; i <= 20000; i++)
    item.run([i, ((i * 7) % n) + 1, ((i * 13) % 2000) + 1, (i % 4) + 1]);
  item.free();
  db.run("COMMIT");
}
export function seedRideHailing(db: Database) {
  db.run(
    "CREATE TABLE drivers(id INTEGER PRIMARY KEY,name TEXT,city TEXT,rating REAL);CREATE TABLE riders(id INTEGER PRIMARY KEY,name TEXT,city TEXT);CREATE TABLE trips(id INTEGER PRIMARY KEY,driver_id INTEGER,rider_id INTEGER,status TEXT,fare REAL,created_at TEXT)",
  );
  db.run("BEGIN");
  let s = db.prepare("INSERT INTO drivers VALUES(?,?,?,?)");
  for (let i = 1; i <= 5000; i++)
    s.run([
      i,
      `Driver ${i}`,
      ["Austin", "Oslo", "Lisbon", "Kyoto"][i % 4],
      Number((3.5 + (i % 15) / 10).toFixed(1)),
    ]);
  s.free();
  s = db.prepare("INSERT INTO riders VALUES(?,?,?)");
  for (let i = 1; i <= 15000; i++)
    s.run([i, `Rider ${i}`, ["Austin", "Oslo", "Lisbon", "Kyoto"][i % 4]]);
  s.free();
  s = db.prepare("INSERT INTO trips VALUES(?,?,?,?,?,?)");
  for (let i = 1; i <= 45000; i++)
    s.run([
      i,
      ((i * 17) % 5000) + 1,
      ((i * 29) % 15000) + 1,
      ["completed", "completed", "completed", "cancelled", "in_progress"][
        i % 5
      ],
      Number((5 + ((i * 13) % 850) / 10).toFixed(2)),
      `2025-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
    ]);
  s.free();
  db.run("COMMIT");
}
export function seedSocialGraph(db: Database) {
  db.run(
    "CREATE TABLE users(id INTEGER PRIMARY KEY,name TEXT,handle TEXT,city TEXT);CREATE TABLE follows(id INTEGER PRIMARY KEY,follower_id INTEGER,followed_id INTEGER,created_at TEXT);CREATE TABLE posts(id INTEGER PRIMARY KEY,user_id INTEGER,body TEXT,likes INTEGER,created_at TEXT)",
  );
  db.run("BEGIN");
  let s = db.prepare("INSERT INTO users VALUES(?,?,?,?)");
  for (let i = 1; i <= 10000; i++)
    s.run([
      i,
      `Member ${i}`,
      `member_${i}`,
      ["Austin", "Oslo", "Lisbon", "Kyoto"][i % 4],
    ]);
  s.free();
  s = db.prepare("INSERT INTO follows VALUES(?,?,?,?)");
  for (let i = 1; i <= 30000; i++)
    s.run([
      i,
      ((i * 17) % 10000) + 1,
      ((i * 37) % 10000) + 1,
      `2025-${String((i % 12) + 1).padStart(2, "0")}-10`,
    ]);
  s.free();
  s = db.prepare("INSERT INTO posts VALUES(?,?,?,?,?)");
  for (let i = 1; i <= 25000; i++)
    s.run([
      i,
      ((i * 13) % 10000) + 1,
      `A small update from the community · ${i}`,
      (i * 7) % 500,
      `2025-${String((i % 12) + 1).padStart(2, "0")}-15`,
    ]);
  s.free();
  db.run("COMMIT");
}
export function seedCustom(db: Database, ddl: string, rowsPerTable: number) {
  db.run(ddl);
  for (const t of getSchema(db)) {
    if (!t.columns.length || t.count) continue;
    const cols = t.columns.filter((c) => !c.pk || !/INTEGER/i.test(c.type));
    if (!cols.length) continue;
    const q = t.name.replaceAll('"', '""'),
      stmt = db.prepare(
        `INSERT INTO "${q}" (${cols.map((c) => `"${c.name.replaceAll('"', '""')}"`).join(",")}) VALUES (${cols.map(() => "?").join(",")})`,
      );
    for (let i = 0; i < rowsPerTable; i++)
      stmt.run(cols.map((c, j) => fake(c.name, c.type, i, j)));
    stmt.free();
  }
}
function fake(
  name: string,
  type: string,
  i: number,
  j: number,
): string | number {
  const n = name.toLowerCase();
  if (/id$/.test(n) || /integer/i.test(type)) return i + 1;
  if (/email/.test(n)) return `person${i + 1}@example.com`;
  if (/name/.test(n)) return `Sample ${i + 1}`;
  if (/city/.test(n)) return ["Portland", "Lisbon", "Oslo", "Kyoto"][i % 4];
  if (/status/.test(n)) return ["active", "pending", "complete"][i % 3];
  if (/price|amount|total|rating|real|numeric/i.test(`${n} ${type}`))
    return Number((10 + ((i * 7) % 1000) / 10).toFixed(2));
  if (/date|created_at/.test(n))
    return `2025-${String((i % 12) + 1).padStart(2, "0")}-15`;
  if (/text|char|clob/i.test(type))
    return `${name.replaceAll("_", " ")} ${i + 1}`;
  return i + j + 1;
}
