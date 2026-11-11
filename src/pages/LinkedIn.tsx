import { useState } from "react";
import { api, type LinkedInNote, type LinkedInStatus } from "../api";
import { Badge, Empty, Loading, ScorePill, timeAgo, useAsync, type Tone } from "../ui";

const FILTERS: [string, string][] = [
  ["pending", "To send"],
  ["sent", "Sent"],
  ["replied", "Replied"],
  ["skipped", "Skipped"],
  ["", "All"],
];

const STATUS_TONE: Record<LinkedInStatus, Tone> = { pending: "neutral", sent: "info", replied: "good", skipped: "neutral" };

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function NoteCard({ n, onChange }: { n: LinkedInNote; onChange: (n: LinkedInNote) => void }) {
  const [name, setName] = useState("");
  const [body, setBody] = useState(n.note);
  const [copied, setCopied] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"connection" | "message">("message");

  const links = [n.resume_url && `Resume: ${n.resume_url}`, n.portfolio_url && `Portfolio: ${n.portfolio_url}`]
    .filter(Boolean).join("\n");
  const full = `${name.trim() ? `Hi ${name.trim()},` : "Hi,"} ${body.trim()}${mode === "message" && links ? `\n\n${links}` : ""}`;
  const over = mode === "connection" && full.length > n.max_chars;

  async function copy() {
    setCopied(await copyText(full));
    setTimeout(() => setCopied(null), 2000);
  }

  async function set(status: LinkedInStatus) {
    setBusy(true);
    try {
      onChange(await api.setLinkedInStatus(n.id, status));
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="card draft">
      <div className="row-between">
        <div>
          <div className="row">
            <ScorePill score={n.job.score} />
            <a href={n.job.url} target="_blank" rel="noreferrer" className="title-link">
              {n.job.title}
            </a>
          </div>
          <div className="muted">
            {n.job.company}
            {n.job.location && ` · ${n.job.location}`}
            {n.job.status === "drafted" && " · also emailed"}
          </div>
        </div>
        <div className="row">
          <Badge tone={STATUS_TONE[n.status]}>{n.status}</Badge>
          <span className="muted small">{timeAgo(n.created_at)}</span>
        </div>
      </div>

      <div className="row">
        <a className="btn" href={n.company_url} target="_blank" rel="noreferrer">
          {n.company_page_known ? "Company page ↗" : "Search company ↗"}
        </a>
        <a className="btn" href={n.people_url} target="_blank" rel="noreferrer">
          Find recruiters ↗
        </a>
      </div>

      <div className="segmented" aria-label="Message format">
        <button className={mode === "message" ? "active" : ""} onClick={() => setMode("message")}>
          Message with links
        </button>
        <button className={mode === "connection" ? "active" : ""} onClick={() => setMode("connection")}>
          Connection note
        </button>
      </div>
      <label className="note-greeting">
        <span>Hi</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="first name (optional)" />
        <span>,</span>
      </label>
      <textarea className="note-text" value={body} onChange={(e) => setBody(e.target.value)} rows={4} />
      {mode === "message" && links && <p className="muted small" style={{ whiteSpace: "pre-wrap" }}>{links}</p>}

      <div className="row-between">
        <div className="row actions">
          <button className="btn btn-primary" onClick={copy} disabled={over || !body.trim()}>
            {copied === true ? "Copied" : copied === false ? "Copy failed - select the text" : mode === "message" ? "Copy message" : "Copy note"}
          </button>
          {n.status !== "sent" && (
            <button className="btn" disabled={busy} onClick={() => set("sent")}>
              Mark sent
            </button>
          )}
          {n.status !== "replied" && (
            <button className="btn btn-good" disabled={busy} onClick={() => set("replied")}>
              Got a reply
            </button>
          )}
          {n.status === "pending" && (
            <button className="btn btn-ghost" disabled={busy} onClick={() => set("skipped")}>
              Skip
            </button>
          )}
          {n.status !== "pending" && (
            <button className="btn btn-ghost" disabled={busy} onClick={() => set("pending")}>
              Undo
            </button>
          )}
        </div>
        <span className={`counter ${over ? "text-bad" : "muted"}`}>
          {mode === "connection" ? `${full.length} / ${n.max_chars}` : `${full.length} characters`}
        </span>
      </div>
    </article>
  );
}

export default function LinkedIn() {
  const [filter, setFilter] = useState("pending");
  const { data, error, loading, setData } = useAsync(() => api.linkedin(filter || undefined), [filter]);

  function replace(n: LinkedInNote) {
    setData((prev) => {
      if (!prev) return prev;
      return filter && n.status !== filter ? prev.filter((x) => x.id !== n.id) : prev.map((x) => (x.id === n.id ? n : x));
    });
  }

  return (
    <div className="stack">
      <div className="segmented">
        {FILTERS.map(([k, label]) => (
          <button key={k} className={filter === k ? "active" : ""} onClick={() => setFilter(k)}>
            {label}
          </button>
        ))}
      </div>
      <p className="muted small">
        Copy the message and send it on LinkedIn. Your resume and portfolio links are included.
        Add their first name if you'd like. For an invitation, switch to Connection note.
      </p>
      <Loading error={error} loading={loading && !data} />
      {data && data.length === 0 && <Empty>Nothing here.</Empty>}
      {data?.map((n) => <NoteCard key={n.id} n={n} onChange={replace} />)}
    </div>
  );
}
