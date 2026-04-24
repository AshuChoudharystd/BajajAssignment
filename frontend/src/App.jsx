import { useMemo, useState } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/bfhl";

const SAMPLE_INPUT = `[
  "A->B",
  "A->C",
  "B->D",
  "C->E",
  "E->F",
  "X->Y",
  "Y->Z",
  "Z->X",
  "G->H",
  "G->H",
  "hello",
  "A->A"
]`;

function parseInput(raw) {
  const trimmed = raw.trim();

  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch (error) {
    // Fallback below
    console.log(error);
  }

  return trimmed
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function TreeBranch({ label, childrenMap }) {
  const entries = Object.entries(childrenMap);

  return (
    <li className="tree-item">
      <div className="tree-node">{label}</div>

      {entries.length > 0 && (
        <ul className="tree-list">
          {entries.map(([child, grandChildren]) => (
            <TreeBranch
              key={`${label}-${child}`}
              label={child}
              childrenMap={grandChildren}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function HierarchyCard({ hierarchy }) {
  const rootEntries = Object.entries(hierarchy.tree);

  return (
    <article className="hierarchy-card">
      <div className="hierarchy-header">
        <div>
          <h3>Root: {hierarchy.root}</h3>
          <p>
            {hierarchy.has_cycle
              ? "Cycle detected"
              : `Depth: ${hierarchy.depth || 0}`}
          </p>
        </div>

        <span
          className={`badge ${
            hierarchy.has_cycle ? "badge-cycle" : "badge-tree"
          }`}
        >
          {hierarchy.has_cycle ? "Cycle" : "Tree"}
        </span>
      </div>

      {hierarchy.has_cycle ? (
        <div className="empty-state">
          This group contains a cycle, so the API returns an empty tree.
        </div>
      ) : (
        <ul className="tree-list tree-root">
          {rootEntries.map(([root, children]) => (
            <TreeBranch key={root} label={root} childrenMap={children} />
          ))}
        </ul>
      )}
    </article>
  );
}

export default function App() {
  const [input, setInput] = useState(SAMPLE_INPUT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const parsedPreview = useMemo(() => parseInput(input), [input]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setResult(null);

    const data = parseInput(input);

    if (data.length === 0) {
      setError("Please enter at least one edge.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data }),
      });

      const contentType = response.headers.get("content-type") || "";
      const body = contentType.includes("application/json")
        ? await response.json()
        : await response.text();

      if (!response.ok) {
        const message =
          typeof body === "string"
            ? body
            : body?.error || "Request failed. Please check the backend.";
        throw new Error(message);
      }

      setResult(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">SRM Full Stack Challenge</p>
        <h1>Hierarchy Analyzer</h1>
        <p className="hero-copy">
          Paste a JSON array like <code>["A-&gt;B","A-&gt;C"]</code> or enter
          one edge per line. This sends the correct payload format:
          <code>{` { "data": [...] } `}</code>
        </p>
      </section>

      <section className="grid">
        <form className="panel" onSubmit={handleSubmit}>
          <div className="panel-header">
            <h2>Input</h2>
          </div>

          <textarea
            className="input-box"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='["A->B", "A->C"] or one edge per line'
          />

          <div className="meta-row">
            <span>{parsedPreview.length} item(s) ready to send</span>
            <span>POST /bfhl</span>
          </div>

          <div className="button-row">
            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading}
            >
              {loading ? "Submitting..." : "Submit"}
            </button>

            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => setInput(SAMPLE_INPUT)}
              disabled={loading}
            >
              Load Sample
            </button>
          </div>

          {error && <div className="error-box">{error}</div>}
        </form>

        <section className="panel">
          <div className="panel-header">
            <h2>Summary</h2>
            <span className="muted">
              {result ? "Latest response" : "Waiting for response"}
            </span>
          </div>

          {result ? (
            <>
              <div className="summary-grid">
                <div className="stat-card">
                  <span>Total Trees</span>
                  <strong>{result.summary.total_trees}</strong>
                </div>

                <div className="stat-card">
                  <span>Total Cycles</span>
                  <strong>{result.summary.total_cycles}</strong>
                </div>

                <div className="stat-card">
                  <span>Largest Tree Root</span>
                  <strong>{result.summary.largest_tree_root || "-"}</strong>
                </div>
              </div>

              <div className="identity-card">
                <p>
                  <strong>User ID:</strong> {result.user_id}
                </p>
                <p>
                  <strong>Email:</strong> {result.email_id}
                </p>
                <p>
                  <strong>Roll No:</strong> {result.college_roll_number}
                </p>
              </div>
            </>
          ) : (
            <div className="empty-state">
              Submit your data to view the processed result here.
            </div>
          )}
        </section>
      </section>

      {result && (
        <>
          <section className="panel section-gap">
            <div className="panel-header">
              <h2>Hierarchies</h2>
              <span className="muted">
                {result.hierarchies.length} group(s)
              </span>
            </div>

            <div className="hierarchy-grid">
              {result.hierarchies.map((hierarchy, index) => (
                <HierarchyCard
                  key={`${hierarchy.root}-${index}`}
                  hierarchy={hierarchy}
                />
              ))}
            </div>
          </section>

          <section className="grid section-gap">
            <div className="panel">
              <div className="panel-header">
                <h2>Invalid Entries</h2>
                <span className="muted">{result.invalid_entries.length}</span>
              </div>

              {result.invalid_entries.length > 0 ? (
                <div className="chip-wrap">
                  {result.invalid_entries.map((item, index) => (
                    <span className="chip chip-danger" key={`${item}-${index}`}>
                      {item || "(empty string)"}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="empty-state">No invalid entries.</div>
              )}
            </div>

            <div className="panel">
              <div className="panel-header">
                <h2>Duplicate Edges</h2>
                <span className="muted">{result.duplicate_edges.length}</span>
              </div>

              {result.duplicate_edges.length > 0 ? (
                <div className="chip-wrap">
                  {result.duplicate_edges.map((item, index) => (
                    <span
                      className="chip chip-warning"
                      key={`${item}-${index}`}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="empty-state">No duplicate edges.</div>
              )}
            </div>
          </section>

          <section className="panel section-gap">
            <div className="panel-header">
              <h2>Raw JSON</h2>
            </div>

            <pre className="json-box">{JSON.stringify(result, null, 2)}</pre>
          </section>
        </>
      )}
    </main>
  );
}
