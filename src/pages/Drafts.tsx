import { useState } from "react";
import { api, type Draft, type DraftStatus } from "../api";
import { Badge, Empty, Loading, ScorePill, timeAgo, useAsync, type Tone } from "../ui";

const FILTERS: [string, string][] = [
  ["drafted", "To send"],
  ["sent", "Sent"],
  ["replied", "Replied"],
  ["skipped", "Skipped"],
  ["", "All"],
];

const SOURCE_LABEL: Record<string, [string, Tone]> = {
  jd: ["from job post", "good"],
  apollo: ["Apollo", "info"],
  hunter: ["Hunter", "info"],
  pattern: ["guessed from pattern", "warn"],
};

const STATUS_TONE: Record<DraftStatus, Tone> = { drafted: "neutral", sent: "info", replied: "good", skipped: "neutral" };

function DraftCard({ d, onChange }: { d: Draft; onChange: (d: Draft) => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [source, sourceTone] = SOURCE_LABEL[d.contact_source ?? ""] ?? [d.contact_source ?? "?", "neutral"];

  async function set(status: DraftStatus) {
    setBusy(true);
    try {
      onChange(await api.setDraftStatus(d.id, status));
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="card draft">
      <div className="row-between">
        <div>
          <div className="row">
            <ScorePill score={d.job.score} />
            <a href={d.job.url} target="_blank" rel="noreferrer" className="title-link">
              {d.job.title}
            </a>
          </div>
          <div className="muted">{d.job.company}</div>
        </div>
        <div className="row">
          <Badge tone={STATUS_TONE[d.status]}>{d.status}</Badge>
          <span className="muted small">{timeAgo(d.created_at)}</span>
        </div>
      </div>

      <div className="to-line">
        <span className="muted">To</span> <strong>{d.contact_name ?? "Hiring team"}</strong>
        {d.contact_title && <span className="muted"> · {d.contact_title}</span>}
        <span className="mono"> &lt;{d.to_email}&gt;</span> <Badge tone={sourceTone}>{source}</Badge>
        {d.contact_source === "pattern" && <span className="small text-warn"> verify before sending</span>}
      </div>

      <button className="subject" onClick={() => setOpen(!open)}>
        <span>{open ? "▾" : "▸"}</span> {d.subject}
      </button>
      {open && <pre className="body">{d.body}</pre>}

      <div className="row actions">
        {d.status !== "sent" && (
          <button className="btn" disabled={busy} onClick={() => set("sent")}>
            Mark sent
          </button>
        )}
        {d.status !== "replied" && (
          <button className="btn btn-good" disabled={busy} onClick={() => set("replied")}>
            Got a reply
          </button>
        )}
        {d.status === "drafted" && (
          <button className="btn btn-ghost" disabled={busy} onClick={() => set("skipped")}>
            Skip
          </button>
        )}
        {d.status !== "drafted" && (
          <button className="btn btn-ghost" disabled={busy} onClick={() => set("drafted")}>
            Undo
          </button>
        )}
      </div>
    </article>
  );
}

export default function Drafts() {
  const [filter, setFilter] = useState("drafted");
  const { data, error, loading, setData } = useAsync(() => api.drafts(filter || undefined), [filter]);

  function replace(d: Draft) {
    setData((prev) => {
      if (!prev) return prev;
      // Drop it from a filtered view once its status no longer matches.
      return filter && d.status !== filter ? prev.filter((x) => x.id !== d.id) : prev.map((x) => (x.id === d.id ? d : x));
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
      <Loading error={error} loading={loading && !data} />
      {data && data.length === 0 && <Empty>Nothing here.</Empty>}
      {data?.map((d) => <DraftCard key={d.id} d={d} onChange={replace} />)}
    </div>
  );
}
