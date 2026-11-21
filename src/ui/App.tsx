import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  Braces,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Code2,
  Database,
  Download,
  FileCode2,
  Gauge,
  History,
  Lightbulb,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Table2,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import type { Database as SqlDatabase } from "sql.js";
import {
  analyzePlan,
  recommendIndex,
  type PlanNode,
} from "../analyzer/planAnalyzer";
import {
  createDatabase,
  getSchema,
  runQuery,
  seedCustom,
  seedEcommerce,
  seedRideHailing,
  seedSocialGraph,
  type QueryResult,
} from "../db/sqliteEngine";
const examples = [
  {
    title: "Find recent orders",
    sql: "SELECT id, customer_id, status, total, created_at\nFROM orders\nWHERE customer_id = 42\nORDER BY created_at DESC\nLIMIT 8;",
  },
  {
    title: "Revenue by city",
    sql: "SELECT c.city, COUNT(*) AS orders, ROUND(SUM(o.total), 2) AS revenue\nFROM orders o\nJOIN customers c ON c.id = o.customer_id\nWHERE o.status = 'delivered'\nGROUP BY c.city\nORDER BY revenue DESC;",
  },
  {
    title: "Popular products",
    sql: "SELECT p.name, SUM(oi.quantity) AS units_sold\nFROM order_items oi\nJOIN products p ON p.id = oi.product_id\nGROUP BY p.id\nORDER BY units_sold DESC\nLIMIT 10;",
  },
];
const rideExamples = [
  {
    title: "Trips by driver",
    sql: "SELECT driver_id, COUNT(*) AS trips, ROUND(AVG(fare), 2) AS avg_fare\nFROM trips\nWHERE status = 'completed'\nGROUP BY driver_id\nORDER BY trips DESC\nLIMIT 10;",
  },
  {
    title: "Rider activity",
    sql: "SELECT r.city, COUNT(*) AS completed_trips, ROUND(SUM(t.fare), 2) AS revenue\nFROM trips t\nJOIN riders r ON r.id = t.rider_id\nWHERE t.status = 'completed'\nGROUP BY r.city\nORDER BY revenue DESC;",
  },
  {
    title: "Recent trips",
    sql: "SELECT id, driver_id, rider_id, fare, created_at\nFROM trips\nWHERE driver_id = 42\nORDER BY created_at DESC\nLIMIT 8;",
  },
];
const socialExamples = [
  {
    title: "Most followed",
    sql: "SELECT u.name, COUNT(*) AS followers\nFROM follows f\nJOIN users u ON u.id = f.followed_id\nGROUP BY u.id\nORDER BY followers DESC\nLIMIT 10;",
  },
  {
    title: "City communities",
    sql: "SELECT city, COUNT(*) AS members\nFROM users\nGROUP BY city\nORDER BY members DESC;",
  },
  {
    title: "Latest posts",
    sql: "SELECT u.handle, p.body, p.likes, p.created_at\nFROM posts p\nJOIN users u ON u.id = p.user_id\nORDER BY p.created_at DESC\nLIMIT 10;",
  },
];
type Dataset = "E-commerce" | "Ride-hailing" | "Social graph";
type Snapshot = { label: string; file: Uint8Array };
export default function App() {
  const [db, setDb] = useState<SqlDatabase | null>(null),
    [ready, setReady] = useState(false),
    [schema, setSchema] = useState<ReturnType<typeof getSchema>>([]),
    [sql, setSql] = useState(examples[0].sql),
    [query, setQuery] = useState<QueryResult | null>(null),
    [nodes, setNodes] = useState<PlanNode[]>([]),
    [error, setError] = useState(""),
    [tab, setTab] = useState<"plan" | "btree">("plan"),
    [history, setHistory] = useState<Snapshot[]>([]),
    [historyIndex, setHistoryIndex] = useState(0),
    [modal, setModal] = useState(false),
    [dataset, setDataset] = useState<Dataset>("E-commerce"),
    [datasetMenu, setDatasetMenu] = useState(false),
    [ddl, setDdl] = useState(
      "CREATE TABLE clinics (id INTEGER PRIMARY KEY, name TEXT, city TEXT, specialty TEXT, rating REAL);\nCREATE TABLE appointments (id INTEGER PRIMARY KEY, clinic_id INTEGER, patient_name TEXT, status TEXT, visit_date TEXT);",
    ),
    [rows, setRows] = useState(1000),
    [notice, setNotice] = useState(""),
    [benchmark, setBenchmark] = useState<{
      index: string;
      before: number;
      after: number;
    } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const currentExamples =
    dataset === "Ride-hailing"
      ? rideExamples
      : dataset === "Social graph"
        ? socialExamples
        : examples;
  const refreshSchema = useCallback((d: SqlDatabase) => {
    setSchema(getSchema(d));
  }, []);
  const snap = useCallback(
    (d: SqlDatabase, label: string) => {
      const item = { label, file: d.export() };
      setHistory((h) => {
        const next = [...h.slice(0, historyIndex + 1), item].slice(-25);
        setHistoryIndex(next.length - 1);
        return next;
      });
    },
    [historyIndex],
  );
  useEffect(() => {
    let live = true;
    createDatabase()
      .then((d) => {
        if (!live) {
          d.close();
          return;
        }
        seedEcommerce(d);
        setDb(d);
        refreshSchema(d);
        const initial = { label: "Starting point", file: d.export() };
        setHistory([initial]);
        setReady(true);
        const r = runQuery(d, examples[0].sql);
        setQuery(r);
        setNodes(analyzePlan(r.plan, { orders: 40000 }));
      })
      .catch((e) => setError(String(e)));
    return () => {
      live = false;
    };
  }, [refreshSchema]);
  const tableCounts = useMemo(
    () =>
      Object.fromEntries(schema.map((t) => [t.name.toLowerCase(), t.count])),
    [schema],
  );
  const existing = useMemo(
    () =>
      schema.flatMap((t) =>
        t.indexes.map((i) => ({ table: t.name, columns: i.columns })),
      ),
    [schema],
  );
  const suggested = useMemo(
    () =>
      recommendIndex(
        sql,
        schema.map((t) => ({
          name: t.name,
          columns: t.columns.map((c) => c.name),
        })),
        existing,
      ),
    [sql, schema, existing],
  );
  const scans = nodes.filter((n) => n.severity === "slow").length;
  const score = query
    ? Math.max(
        38,
        Math.min(
          100,
          100 -
            scans * 28 -
            nodes.filter((n) => n.severity === "warning").length * 10,
        ),
      )
    : 0;
  const run = useCallback(
    (override?: string) => {
      if (!db) return;
      const text = override ?? sql;
      setError("");
      try {
        const result = runQuery(db, text);
        setQuery(result);
        setNodes(analyzePlan(result.plan, tableCounts));
        setSql(text);
        refreshSchema(db);
        if (!/^\s*(select|with|explain)\b/i.test(text)) {
          snap(
            db,
            text.trim().split(/\s+/).slice(0, 3).join(" ").toUpperCase(),
          );
          setNotice("Database updated");
          setTimeout(() => setNotice(""), 2200);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setQuery(null);
        setNodes([]);
      }
    },
    [db, sql, tableCounts, refreshSchema, snap],
  );
  const applyIndex = () => {
    if (!db || !suggested) return;
    const before = query?.time ?? 0;
    try {
      db.run(suggested);
      snap(db, `Created ${suggested.match(/INDEX\s+(\w+)/i)?.[1] ?? "index"}`);
      refreshSchema(db);
      const after = runQuery(db, sql);
      setQuery(after);
      setNodes(analyzePlan(after.plan, tableCounts));
      setBenchmark({
        index: suggested.match(/INDEX\s+(\w+)/i)?.[1] ?? "index",
        before,
        after: after.time,
      });
      setNotice(
        `Index applied · ${before.toFixed(2)} ms → ${after.time.toFixed(2)} ms`,
      );
      setTimeout(() => setNotice(""), 3500);
    } catch (e) {
      setError(String(e));
    }
  };
  const removeIndex = (name: string) => {
    if (!db) return;
    try {
      db.run(`DROP INDEX "${name.replaceAll('"', '""')}"`);
      snap(db, `Dropped ${name}`);
      refreshSchema(db);
      const result = runQuery(db, sql);
      setQuery(result);
      setNodes(analyzePlan(result.plan, tableCounts));
    } catch (e) {
      setError(String(e));
    }
  };
  const switchDataset = async (name: Dataset) => {
    setDataset(name);
    setBenchmark(null);
    setDatasetMenu(false);
    db?.close();
    const next = await createDatabase();
    if (name === "Ride-hailing") seedRideHailing(next);
    else if (name === "Social graph") seedSocialGraph(next);
    else seedEcommerce(next);
    setDb(next);
    refreshSchema(next);
    const first = (
      name === "Ride-hailing"
        ? rideExamples
        : name === "Social graph"
          ? socialExamples
          : examples
    )[0];
    setSql(first.sql);
    const point = { label: `${name} seed`, file: next.export() };
    setHistory([point]);
    setHistoryIndex(0);
    setQuery(runQuery(next, first.sql));
    setNodes(analyzePlan(runQuery(next, first.sql).plan));
    setNotice(`${name} dataset ready`);
    setTimeout(() => setNotice(""), 2400);
  };
  const reset = async () => {
    await switchDataset("E-commerce");
    setNotice("Fresh dataset loaded");
    setTimeout(() => setNotice(""), 2200);
  };
  const travel = async (index: number) => {
    const point = history[index];
    if (!point) return;
    const next = await createDatabase(point.file);
    db?.close();
    setDb(next);
    refreshSchema(next);
    setHistoryIndex(index);
    setQuery(null);
    setNodes([]);
    setNotice(`Restored · ${point.label}`);
    setTimeout(() => setNotice(""), 2200);
  };
  const importDb = async (file?: File) => {
    if (!file) return;
    try {
      const next = await createDatabase(
        new Uint8Array(await file.arrayBuffer()),
      );
      db?.close();
      setDb(next);
      refreshSchema(next);
      setHistory([{ label: "Imported database", file: next.export() }]);
      setHistoryIndex(0);
      setNotice("Database imported");
      setTimeout(() => setNotice(""), 2200);
    } catch (e) {
      setError(`Couldn't open database: ${String(e)}`);
    }
  };
  const exportDb = () => {
    if (!db) return;
    const bytes = db.export(),
      copy = Uint8Array.from(bytes);
    const blob = new Blob([copy.buffer], { type: "application/x-sqlite3" }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "sql-xray.sqlite";
    a.click();
    URL.revokeObjectURL(url);
  };
  const buildCustom = async () => {
    if (!db) return;
    try {
      const next = await createDatabase();
      seedCustom(next, ddl, rows);
      db.close();
      setDb(next);
      refreshSchema(next);
      const firstTable = getSchema(next)[0];
      const firstQuery = firstTable
        ? `SELECT * FROM "${firstTable.name.replaceAll('"', '""')}" LIMIT 25;`
        : "SELECT 1 AS ready;";
      setHistory([{ label: "Custom schema seed", file: next.export() }]);
      setHistoryIndex(0);
      setBenchmark(null);
      setQuery(null);
      setNodes([]);
      setModal(false);
      setSql(firstQuery);
      setNotice("Schema built and seeded");
      setTimeout(() => setNotice(""), 2500);
    } catch (e) {
      setError(String(e));
      setModal(false);
    }
  };
  const handleKey = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      run();
    }
  };
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <Activity size={17} />
          </span>
          <span>
            sql<span className="brand-light">xray</span>
          </span>
          <span className="version">STUDIO</span>
        </div>
        <div className="top-divider" />
        <div className="dataset-wrap">
          <button
            className="dataset-pill"
            onClick={() => setDatasetMenu((open) => !open)}
          >
            <span className="dataset-dot" />
            {dataset} sample
            <ChevronDown size={14} />
          </button>
          {datasetMenu && (
            <div className="dataset-menu">
              {(
                ["E-commerce", "Ride-hailing", "Social graph"] as Dataset[]
              ).map((name) => (
                <button
                  key={name}
                  className={dataset === name ? "current" : ""}
                  onClick={() => switchDataset(name)}
                >
                  <span className="dataset-dot" />
                  {name}
                  <small>
                    {name === "E-commerce"
                      ? "72k rows"
                      : name === "Ride-hailing"
                        ? "65k rows"
                        : "65k rows"}
                  </small>
                  {dataset === name && <Check size={13} />}
                </button>
              ))}
              <button
                className="custom-menu-option"
                onClick={() => {
                  setDatasetMenu(false);
                  setModal(true);
                }}
              >
                <Braces size={14} />
                Custom schema & seeder
                <Plus size={13} />
              </button>
            </div>
          )}
        </div>
        <div className="top-actions">
          <button
            className="quiet-btn"
            onClick={() => fileRef.current?.click()}
          >
            <ArrowUpFromLine size={15} />
            <span>Import</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".db,.sqlite,.sqlite3"
            hidden
            onChange={(e) => importDb(e.target.files?.[0])}
          />
          <button className="quiet-btn" onClick={exportDb}>
            <ArrowDownToLine size={15} />
            <span>Export</span>
          </button>
          <span className="top-divider small-hide" />
          <button
            className="icon-button"
            title="Reset database"
            onClick={reset}
          >
            <RefreshCw size={15} />
          </button>
          <button className="avatar">A</button>
        </div>
      </header>
      <main className="workspace">
        <aside className="sidebar">
          <div className="sidebar-head">
            <div>
              <div className="eyebrow">WORKSPACE</div>
              <div className="side-title">Explorer</div>
            </div>
            <button
              className="small-icon"
              title="Add schema"
              onClick={() => setModal(true)}
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="side-search">
            <Search size={14} />
            <span>Filter tables</span>
            <kbd>⌘ K</kbd>
          </div>
          <div className="section-label">
            <span>TABLES</span>
            <span className="count-chip">{schema.length}</span>
          </div>
          <div className="table-list">
            {schema.map((t) => (
              <div className="table-item" key={t.name}>
                <div className="table-top">
                  <Table2 size={15} />
                  <span className="table-name">{t.name}</span>
                  <span className="row-count">{t.count.toLocaleString()}</span>
                </div>
                <div className="table-meta">{t.columns.length} columns</div>
                {t.indexes.map((index) => (
                  <button
                    className="index-chip"
                    key={index.name}
                    title={"Drop " + index.name}
                    onClick={() => removeIndex(index.name)}
                  >
                    <span />
                    {index.name}
                    <X size={11} />
                  </button>
                ))}
              </div>
            ))}
          </div>
          <div className="sidebar-rule" />
          <div className="section-label challenge-label">
            QUERY EXAMPLES <CircleHelp size={13} />
          </div>
          <div className="challenge-list">
            {currentExamples.map((ex, i) => (
              <button
                className={`challenge ${sql === ex.sql ? "selected" : ""}`}
                onClick={() => {
                  setSql(ex.sql);
                  setTimeout(() => run(ex.sql), 0);
                }}
                key={ex.title}
              >
                <span className="challenge-number">0{i + 1}</span>
                <span>{ex.title}</span>
                <ChevronRight size={14} />
              </button>
            ))}
          </div>
          <div className="side-bottom">
            <button className="custom-link" onClick={() => setModal(true)}>
              <Braces size={15} />
              Custom schema & seeder
              <Plus size={14} />
            </button>
            <div className="sidebar-foot">
              <span className="live-pulse" />
              SQLite running locally<span className="local-lock">PRIVATE</span>
            </div>
          </div>
        </aside>
        <section className="main-area">
          <div className="page-heading">
            <div>
              <div className="breadcrumb">
                Workspace <ChevronRight size={13} /> Query lab
              </div>
              <h1>
                Query lab <span className="heading-dot">.</span>
              </h1>
              <p>See what happens under the hood when your SQL runs.</p>
            </div>
            <div className="heading-status">
              <span className={`status-dot ${ready ? "" : "loading"}`} />
              {ready ? "Database ready" : "Starting engine"}
            </div>
          </div>
          <div className="upper-grid">
            <section className="panel editor-panel">
              <div className="panel-top">
                <div className="panel-title">
                  <span className="title-icon editor-icon">
                    <Code2 size={15} />
                  </span>
                  <span>SQL editor</span>
                  <span className="file-label">query.sql</span>
                </div>
                <div className="panel-tools">
                  <button className="tool-btn" title="Format query">
                    <Settings2 size={15} />
                  </button>
                  <button
                    className="tool-btn"
                    title="Query templates"
                    onClick={() =>
                      setSql(
                        examples[
                          (currentExamples.findIndex((x) => x.sql === sql) +
                            1) %
                            currentExamples.length
                        ].sql,
                      )
                    }
                  >
                    <FileCode2 size={15} />
                  </button>
                </div>
              </div>
              <div className="editor-body">
                <div className="line-numbers">
                  {sql.split("\n").map((_, i) => (
                    <span key={i}>{String(i + 1).padStart(2, "0")}</span>
                  ))}
                </div>
                <textarea
                  ref={editorRef}
                  value={sql}
                  onChange={(e) => setSql(e.target.value)}
                  onKeyDown={handleKey}
                  spellCheck={false}
                  aria-label="SQL query editor"
                />
              </div>
              <div className="editor-footer">
                <span className="shortcut-hint">
                  <kbd>⌘</kbd>
                  <kbd>↵</kbd> to run
                </span>
                <button
                  className="run-button"
                  onClick={() => run()}
                  disabled={!ready}
                >
                  <Play size={14} fill="currentColor" />
                  Run query
                </button>
              </div>
            </section>
            <section className="panel plan-panel">
              <div className="panel-top">
                <div className="panel-title">
                  <span className="title-icon xray-icon">
                    <Activity size={15} />
                  </span>
                  <span>Query x-ray</span>
                </div>
                <div className="tabs">
                  <button
                    className={tab === "plan" ? "active" : ""}
                    onClick={() => setTab("plan")}
                  >
                    Plan
                  </button>
                  <button
                    className={tab === "btree" ? "active" : ""}
                    onClick={() => setTab("btree")}
                  >
                    B-tree
                  </button>
                </div>
              </div>
              {tab === "plan" ? (
                <div className="plan-content">
                  {error ? (
                    <div className="error-state">
                      <TriangleAlert size={18} />
                      <div>
                        <strong>Query couldn't run</strong>
                        <span>{error}</span>
                      </div>
                    </div>
                  ) : nodes.length ? (
                    <>
                      <div className="plan-flow">
                        {nodes.map((n, i) => (
                          <div className="plan-step-wrap" key={`${n.id}-${i}`}>
                            <div className={`plan-step ${n.severity}`}>
                              <span className="step-status">
                                {n.severity === "fast" ? (
                                  <Check size={13} />
                                ) : n.severity === "warning" ? (
                                  <TriangleAlert size={13} />
                                ) : (
                                  <Search size={13} />
                                )}
                              </span>
                              <div className="step-copy">
                                <strong>{n.title}</strong>
                                <code>{n.detail}</code>
                              </div>
                              <span className="complexity">{n.complexity}</span>
                            </div>
                            {i < nodes.length - 1 && (
                              <div className="flow-line" />
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="plan-caption">
                        <span className="caption-line" />
                        SQLite execution plan
                        <span className="caption-query">
                          {nodes.length} step{nodes.length === 1 ? "" : "s"}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="empty-plan">
                      <div className="empty-icon">
                        <Activity size={19} />
                      </div>
                      <strong>Ready when you are</strong>
                      <span>Run a query to see its execution path.</span>
                      <button onClick={() => run()}>
                        Run current query <Play size={12} />
                      </button>
                    </div>
                  )}
                  {suggested && !error && (
                    <div className="advisor">
                      <div className="advisor-icon">
                        <Lightbulb size={15} />
                      </div>
                      <div className="advisor-copy">
                        <strong>A small index could help</strong>
                        <span>
                          Speed up this query with{" "}
                          <code>
                            {suggested.match(/ ON (\w+)/)?.[1]}.
                            {suggested.match(/\((.*?)\)/)?.[1]}
                          </code>
                        </span>
                      </div>
                      <button className="apply-btn" onClick={applyIndex}>
                        Add index <ArrowDownToLine size={13} />
                      </button>
                    </div>
                  )}
                  {benchmark && (
                    <div className="benchmark-card">
                      <span className="benchmark-check">
                        <Check size={13} />
                      </span>
                      <div>
                        <strong>{benchmark.index} created</strong>
                        <span>
                          {benchmark.before.toFixed(2)} ms before ·{" "}
                          {benchmark.after.toFixed(2)} ms after
                        </span>
                      </div>
                      <b>
                        {(
                          benchmark.before / Math.max(benchmark.after, 0.01)
                        ).toFixed(1)}
                        × faster
                      </b>
                    </div>
                  )}
                </div>
              ) : (
                <BtreeView schema={schema} nodes={nodes} />
              )}
            </section>
          </div>
          <section className="panel results-panel">
            <div className="panel-top results-top">
              <div className="panel-title">
                <span className="title-icon results-icon">
                  <Table2 size={15} />
                </span>
                <span>Results</span>
                {query && (
                  <span className="result-count">
                    {query.values.length.toLocaleString()} rows
                  </span>
                )}
              </div>
              <div className="result-tools">
                <span className="result-state">
                  <span className="green-dot" />
                  {error ? "Error" : "Latest run"}
                </span>
                <button
                  className="tool-btn"
                  title="Download results"
                  onClick={() => {
                    if (!query) return;
                    const csv = [
                      query.columns.join(","),
                      ...query.values.map((r) =>
                        r.map((v) => JSON.stringify(v ?? "")).join(","),
                      ),
                    ].join("\n");
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(
                      new Blob([csv], { type: "text/csv" }),
                    );
                    a.download = "query-results.csv";
                    a.click();
                  }}
                >
                  <Download size={15} />
                </button>
              </div>
            </div>
            {error ? (
              <div className="result-error">{error}</div>
            ) : query && query.columns.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th className="row-num">#</th>
                      {query.columns.map((c, i) => (
                        <th key={`${c}-${i}`}>
                          {c}
                          <span className="column-type">
                            {typeof query.values.find((r) => r[i] != null)?.[
                              i
                            ] === "number"
                              ? "123"
                              : "ABC"}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {query.values.slice(0, 100).map((row, i) => (
                      <tr key={i}>
                        <td className="row-num">
                          {String(i + 1).padStart(2, "0")}
                        </td>
                        {row.map((v, j) => (
                          <td
                            key={j}
                            className={typeof v === "number" ? "numeric" : ""}
                          >
                            {v == null ? (
                              <span className="null-value">NULL</span>
                            ) : (
                              String(v)
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {query.values.length > 100 && (
                  <div className="table-end">
                    Showing first 100 of {query.values.length.toLocaleString()}{" "}
                    rows
                  </div>
                )}
              </div>
            ) : (
              <div className="no-results">
                {query
                  ? "Statement completed. No rows returned."
                  : "Run a query to see results here."}
              </div>
            )}
            <div className="telemetry">
              <div className="metric">
                <Clock3 size={14} />
                <span>Wall time</span>
                <strong>
                  {query ? query.time.toFixed(2) : "—"}
                  <small>ms</small>
                </strong>
              </div>
              <span className="metric-divider" />
              <div className="metric">
                <Table2 size={14} />
                <span>Rows returned</span>
                <strong>
                  {query ? query.values.length.toLocaleString() : "—"}
                </strong>
              </div>
              <span className="metric-divider" />
              <div className="metric">
                <Gauge size={14} />
                <span>Plan score</span>
                <strong
                  className={
                    score > 75
                      ? "metric-good"
                      : score > 50
                        ? "metric-mid"
                        : "metric-low"
                  }
                >
                  {query ? `${score}` : "—"}
                  <small>/100</small>
                </strong>
              </div>
              <span className="metric-divider" />
              <div className="metric">
                <Database size={14} />
                <span>Indexes used</span>
                <strong>
                  {query
                    ? nodes.filter((node) => /USING .*INDEX/i.test(node.detail))
                        .length
                    : "—"}
                </strong>
              </div>
              <span className="metric-divider" />
              <div className="metric">
                <Code2 size={14} />
                <span>VDBE ops</span>
                <strong>
                  {query ? query.instructions.toLocaleString() : "—"}
                </strong>
              </div>
              <div className="telemetry-spacer" />
              <span className="engine-label">
                <span className="green-dot" />
                SQLite WASM
              </span>
            </div>
          </section>
          <footer className="history-bar">
            <div className="history-label">
              <History size={15} />
              <span>Time travel</span>
            </div>
            <div className="history-track">
              <span className="history-start">START</span>
              <div className="track-line">
                <div
                  className="track-progress"
                  style={{
                    width: `${history.length > 1 ? (historyIndex / (history.length - 1)) * 100 : 0}%`,
                  }}
                />
                {history.map((h, i) => (
                  <button
                    key={`${h.label}-${i}`}
                    title={h.label}
                    className={`history-mark ${i <= historyIndex ? "passed" : ""} ${i === historyIndex ? "current" : ""}`}
                    style={{
                      left: `${history.length > 1 ? (i / (history.length - 1)) * 100 : 0}%`,
                    }}
                    onClick={() => travel(i)}
                  />
                ))}
              </div>
              <span className="history-end">NOW</span>
            </div>
            <div className="history-event">
              <span className="history-count">
                {String(historyIndex).padStart(2, "0")}
              </span>
              <span className="history-event-text">
                {history[historyIndex]?.label ?? "No changes yet"}
              </span>
            </div>
            <button
              className="history-reset"
              onClick={() => travel(0)}
              disabled={historyIndex === 0}
            >
              <RefreshCw size={13} />
            </button>
          </footer>
        </section>
      </main>
      {notice && (
        <div className="toast">
          <Check size={15} />
          {notice}
        </div>
      )}
      {modal && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModal(false);
          }}
        >
          <div className="modal">
            <div className="modal-head">
              <div>
                <div className="eyebrow">MAKE IT YOURS</div>
                <h2>Custom schema</h2>
                <p>
                  Bring your own tables. We’ll fill them with useful sample
                  data.
                </p>
              </div>
              <button className="small-icon" onClick={() => setModal(false)}>
                <X size={17} />
              </button>
            </div>
            <label className="field-label" htmlFor="ddl">
              CREATE TABLE statements
            </label>
            <textarea
              id="ddl"
              className="ddl-input"
              value={ddl}
              onChange={(e) => setDdl(e.target.value)}
              spellCheck={false}
            />
            <div className="modal-controls">
              <label>
                <span>Rows per table</span>
                <select
                  value={rows}
                  onChange={(e) => setRows(Number(e.target.value))}
                >
                  <option value={1000}>1,000 rows</option>
                  <option value={5000}>5,000 rows</option>
                  <option value={10000}>10,000 rows</option>
                </select>
              </label>
              <button className="run-button" onClick={buildCustom}>
                <Braces size={15} />
                Build & seed
              </button>
            </div>
            <div className="modal-note">
              <Lightbulb size={14} />
              Column names shape the sample data: email, city, status, amount,
              date…
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function BtreeView({
  schema,
  nodes,
}: {
  schema: ReturnType<typeof getSchema>;
  nodes: PlanNode[];
}) {
  const table = schema.find((t) => /orders/i.test(t.name)) ?? schema[0];
  const indexed = nodes.some((n) => /INDEX/i.test(n.detail));
  return (
    <div className="btree-content">
      <div className="btree-head">
        <div>
          <div className="btree-eyebrow">PAGE WALKTHROUGH</div>
          <strong>
            {table?.name ?? "Your table"}{" "}
            <span>· {table?.count.toLocaleString() ?? 0} rows</span>
          </strong>
        </div>
        <span className={`btree-badge ${indexed ? "fast" : ""}`}>
          {indexed ? "INDEX SEEK" : "TABLE SCAN"}
        </span>
      </div>
      <div className="tree-diagram">
        <div className="tree-level root-level">
          <span className="page-node root-node">
            <span>ROOT</span>
            <b>{indexed ? "Page 1" : "Table root"}</b>
          </span>
        </div>
        <div className="tree-connect">
          <i />
          <i />
          <i />
        </div>
        <div className="tree-level">
          <span className="page-node branch-node">
            <span>BRANCH</span>
            <b>Page 8</b>
          </span>
          <span className="page-node branch-node muted-node">
            <span>BRANCH</span>
            <b>Page 12</b>
          </span>
        </div>
        <div className="tree-connect leaf-connect">
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className="tree-level">
          <span className="page-node leaf-node">
            <span>LEAF</span>
            <b>Page 9</b>
          </span>
          <span className="page-node leaf-node active-leaf">
            <span>LEAF · MATCH</span>
            <b>Page 10</b>
          </span>
          <span className="page-node leaf-node">
            <span>LEAF</span>
            <b>Page 11</b>
          </span>
        </div>
      </div>
      <div className="btree-foot">
        <span>
          <span className="btree-legend-dot" />
          B-tree traversal
        </span>
        <strong>{indexed ? "~3 page reads" : "Sequential page scan"}</strong>
        <span className="btree-complexity">
          {indexed ? "O(log N)" : "O(N)"}
        </span>
      </div>
    </div>
  );
}
