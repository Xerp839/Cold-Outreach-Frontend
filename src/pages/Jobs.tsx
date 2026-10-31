import { useState } from "react";
import { api, type Job } from "../api";
import { Badge, Empty, Loading, ScorePill, timeAgo, useAsync } from "../ui";

const VIEWS: [string, string, Record<string, string>][] = [
  ["no_contact", "Apply manually", { status: "no_contact" }],
  ["scored", "Queued for draft", { status: "scored" }],
  ["low_score", "Low fit", { status: "low_score", limit: "50" }],
  ["filtered_out", "Filtered out", { status: "filtered_out", limit: "50" }],
  ["error", "Errored", { status: "error" }],
];

const HINT: Record<string, string> = {
  no_contact: "Good fits where no email was found. Apply on the site, or DM someone on LinkedIn.",
  scored: "Good fits waiting for a draft (daily cap or company cooldown). They go out on the next run.",
  low_score: "Scored below the threshold. If one looks wrong, push it to the queue.",
  filtered_out: "Dropped by the free rules before any LLM call.",
  error: "Something failed for these. Check Runs for the reason.",
};

function JobCard({ j, view, onDone }: { j: Job; view: string; onDone: (id: number) => void }) {
  const [busy, setBusy] = useState(false);
  async function set(status: string) {
    setBusy(true);
    try {
      await api.setJobStatus(j.id, status);
      onDone(j.id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="card">
      <div className="row-between">
        <div>
          <div className="row">
            <ScorePill score={j.score} />
            <a href={j.apply_url ?? j.url} target="_blank" rel="noreferrer" className="title-link">
              {j.title}
            </a>
          </div>
          <div className="muted">
            {j.company} · {j.location ?? "-"}
            {j.is_remote && " · remote"} · {j.experience ?? "exp n/a"}
            {j.salary && ` · ${j.salary}`}
          </div>
        </div>
        <div className="row">
          <Badge>{j.source}</Badge>
          <span className="muted small">{timeAgo(j.fetched_at)}</span>
        </div>
      </div>
      {j.summary && <p className="summary">{j.summary}</p>}
      {j.fit_points.length > 0 && (
        <ul className="fit">
          {j.fit_points.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      )}
      {j.gaps.length > 0 && <div className="small muted">Gaps: {j.gaps.join(" · ")}</div>}
      {j.status_reason && view !== "low_score" && <div className="small muted">Reason: {j.status_reason}</div>}
      <div className="row actions">
        {view !== "scored" && (
          <button className="btn" disabled={busy} onClick={() => set("scored")}>
            Queue for draft
          </button>
        )}
        {view !== "filtered_out" && (
          <button className="btn btn-ghost" disabled={busy} onClick={() => set("filtered_out")}>
            Dismiss
          </button>
        )}
      </div>
    </article>
  );
}

export default function Jobs() {
  const [view, setView] = useState("no_contact");
  const params = VIEWS.find((v) => v[0] === view)![2];
  const { data, error, loading, setData } = useAsync(() => api.jobs(params), [view]);

  return (
    <div className="stack">
      <div className="segmented">
        {VIEWS.map(([k, label]) => (
          <button key={k} className={view === k ? "active" : ""} onClick={() => setView(k)}>
            {label}
          </button>
        ))}
      </div>
      <p className="muted small">{HINT[view]}</p>
      <Loading error={error} loading={loading && !data} />
      {data && data.length === 0 && <Empty>Nothing here.</Empty>}
      {data?.map((j) => (
        <JobCard key={j.id} j={j} view={view} onDone={(id) => setData((p) => p?.filter((x) => x.id !== id) ?? p)} />
      ))}
    </div>
  );
}
