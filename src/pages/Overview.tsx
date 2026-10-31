import { useEffect, useState } from "react";
import { api } from "../api";
import { Badge, duration, Loading, RUN_TONE, timeAgo, useAsync } from "../ui";

const FUNNEL: [string, string][] = [
  ["filtered_out", "Filtered out (rules)"],
  ["new", "Waiting to be scored"],
  ["low_score", "Low fit"],
  ["scored", "Good fit, queued"],
  ["no_contact", "Good fit, no contact"],
  ["drafted", "Drafted"],
  ["error", "Errored"],
];

const STAT_LABELS: Record<string, string> = {
  fetched: "Fetched",
  new_jobs: "New",
  passed_filter: "Passed rules",
  scored: "Scored",
  good_fit: "Good fit",
  drafted: "Drafted",
  no_contact: "No contact",
  fetch_failures: "Source failures",
};

export default function Overview({ goTo }: { goTo: (tab: string) => void }) {
  const { data, error, loading, reload } = useAsync(api.stats);
  const [starting, setStarting] = useState(false);
  const [runMsg, setRunMsg] = useState<string | null>(null);
  const running = data?.last_run?.status === "running";

  // While a run is in progress, refresh every 10s.
  useEffect(() => {
    if (!running) return;
    const t = setInterval(reload, 10000);
    return () => clearInterval(t);
  }, [running, reload]);

  async function startRun() {
    setStarting(true);
    setRunMsg(null);
    try {
      const { run_id } = await api.startRun();
      setRunMsg(`Run #${run_id} started.`);
      await reload();
    } catch (e) {
      setRunMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setStarting(false);
    }
  }

  if (!data) return <Loading error={error} loading={loading} />;
  const run = data.last_run;
  const waiting = data.drafts_by_status["drafted"] ?? 0;
  const sent = (data.drafts_by_status["sent"] ?? 0) + (data.drafts_by_status["replied"] ?? 0);

  return (
    <div className="stack">
      <div className="cards">
        <div className="card stat">
          <div className="stat-label">Drafts today</div>
          <div className="stat-value">
            {data.drafts_today}
            <span className="stat-sub"> / {data.daily_target}</span>
          </div>
        </div>
        <button className="card stat clickable" onClick={() => goTo("drafts")}>
          <div className="stat-label">Waiting for you to send</div>
          <div className="stat-value">{waiting}</div>
        </button>
        <div className="card stat">
          <div className="stat-label">Sent → replied</div>
          <div className="stat-value">
            {data.drafts_by_status["replied"] ?? 0}
            <span className="stat-sub"> / {sent}</span>
          </div>
          <div className="stat-foot">{data.reply_rate != null ? `${data.reply_rate}% reply rate` : "mark drafts as sent to track"}</div>
        </div>
        <button className="card stat clickable" onClick={() => goTo("runs")}>
          <div className="stat-label">Errors, last 7 days</div>
          <div className={`stat-value ${data.errors_last_7d ? "text-bad" : ""}`}>{data.errors_last_7d}</div>
        </button>
      </div>

      <section className="card">
        <div className="row-between">
          <h2>Last run</h2>
          <div className="row">
            <a className="btn" href="https://mail.google.com/mail/u/0/#drafts" target="_blank" rel="noreferrer">
              Open Gmail drafts
            </a>
            <button className="btn btn-primary" onClick={startRun} disabled={starting || running}>
              {running ? "Running…" : starting ? "Starting…" : "Run now"}
            </button>
          </div>
        </div>
        {runMsg && <div className="notice">{runMsg}</div>}
        {run ? (
          <>
            <div className="row muted">
              <Badge tone={RUN_TONE[run.status]}>{run.status}</Badge>
              <span>
                #{run.id} · {run.trigger} · started {timeAgo(run.started_at)} · {duration(run.started_at, run.finished_at)}
              </span>
            </div>
            {run.error && <div className="notice notice-bad">{run.error}</div>}
            <div className="kv-grid">
              {Object.entries(STAT_LABELS).map(([k, label]) => (
                <div key={k} className="kv">
                  <span className="muted">{label}</span>
                  <strong>{run.stats[k] ?? 0}</strong>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="muted">No runs yet. Hit "Run now" or wait for the 9:00 AM cron.</p>
        )}
      </section>

      <section className="card">
        <h2>All jobs by stage</h2>
        <div className="funnel">
          {FUNNEL.map(([k, label]) => {
            const n = data.jobs_by_status[k] ?? 0;
            const max = Math.max(1, ...Object.values(data.jobs_by_status));
            return (
              <div key={k} className="funnel-row">
                <span className="funnel-label">{label}</span>
                <div className="funnel-track">
                  <div className="funnel-bar" style={{ width: `${(n / max) * 100}%` }} />
                </div>
                <span className="funnel-n">{n}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
