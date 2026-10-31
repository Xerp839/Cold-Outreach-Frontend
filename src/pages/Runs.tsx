import { useState } from "react";
import { api, type LogEvent, type RunStats } from "../api";
import { Badge, duration, Empty, fmtDate, Loading, RUN_TONE, useAsync, type Tone } from "../ui";

const LEVEL_TONE: Record<string, Tone> = { info: "neutral", warning: "warn", error: "bad" };

const STAT_LABELS: [string, string][] = [
  ["fetched", "Fetched"],
  ["new_jobs", "New"],
  ["passed_filter", "Passed rules"],
  ["filtered_out", "Filtered out"],
  ["scored", "Scored"],
  ["good_fit", "Good fit"],
  ["drafted", "Emails drafted"],
  ["no_contact", "No contact"],
  ["waiting_for_hunter", "Waiting for Hunter"],
  ["linkedin_notes", "LinkedIn notes"],
];

// fetched_linkedin / blocked_linkedin -> one row per job source
function sources(stats: RunStats) {
  return Object.keys(stats)
    .filter((k) => k.startsWith("fetched_"))
    .map((k) => {
      const name = k.slice("fetched_".length);
      return { name, jobs: stats[k], blocked: stats[`blocked_${name}`] ?? 0 };
    });
}

function sourceTone(s: { jobs: number; blocked: number }): Tone {
  return s.jobs === 0 ? "bad" : s.blocked ? "warn" : "good";
}

function RunDetails({ id }: { id: number }) {
  const { data, error, loading } = useAsync(() => api.run(id), [id]);
  if (!data) return <Loading error={error} loading={loading} />;
  const srcs = sources(data.stats);
  return (
    <div className="stack pad">
      {data.error && <div className="notice notice-bad">{data.error}</div>}
      {srcs.length > 0 && (
        <div className="row">
          {srcs.map((s) => (
            <Badge key={s.name} tone={sourceTone(s)}>
              {s.name}: {s.jobs} jobs{s.blocked ? ` · ${s.blocked} searches blocked` : ""}
            </Badge>
          ))}
        </div>
      )}
      <div className="kv-grid">
        {STAT_LABELS.map(([k, label]) => (
          <div key={k} className="kv">
            <span className="muted">{label}</span>
            <strong>{data.stats[k] ?? 0}</strong>
          </div>
        ))}
      </div>
      {data.events.length ? <RunEvents events={data.events} /> : <div className="muted small">No events logged.</div>}
    </div>
  );
}

function RunEvents({ events }: { events: LogEvent[] }) {
  return (
    <div className="events">
      {events.map((e) => (
        <div key={e.id} className="event">
          <Badge tone={LEVEL_TONE[e.level]}>{e.level}</Badge>
          <span className="muted small">{e.stage}</span>
          <span className="event-msg">{e.message}</span>
        </div>
      ))}
    </div>
  );
}

export default function Runs() {
  const runs = useAsync(api.runs);
  const errors = useAsync(api.errors);
  const [openId, setOpenId] = useState<number | null>(null);

  return (
    <div className="stack">
      <section className="card">
        <h2>Runs</h2>
        <Loading error={runs.error} loading={runs.loading && !runs.data} />
        {runs.data?.length === 0 && <Empty>No runs yet.</Empty>}
        <div className="table">
          {runs.data?.map((r) => (
            <div key={r.id}>
              <button className="table-row" onClick={() => setOpenId(openId === r.id ? null : r.id)}>
                <span className="mono">#{r.id}</span>
                <Badge tone={RUN_TONE[r.status]}>{r.status}</Badge>
                <span className="muted">{r.trigger}</span>
                <span>{fmtDate(r.started_at)}</span>
                <span className="muted">{duration(r.started_at, r.finished_at)}</span>
                <span className="small">
                  {r.stats.fetched ?? 0} fetched · {r.stats.scored ?? 0} scored · <strong>{r.stats.drafted ?? 0} drafted</strong>
                  {" · "}
                  {r.stats.linkedin_notes ?? 0} notes
                  {sources(r.stats)
                    .filter((s) => sourceTone(s) !== "good")
                    .map((s) => (
                      <span key={s.name}>
                        {" "}
                        <Badge tone={sourceTone(s)}>{s.jobs ? `${s.name} partly blocked` : `${s.name} down`}</Badge>
                      </span>
                    ))}
                </span>
              </button>
              {openId === r.id && <RunDetails id={r.id} />}
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Recent errors</h2>
        <Loading error={errors.error} loading={errors.loading && !errors.data} />
        {errors.data?.length === 0 && <Empty>No errors. Nice.</Empty>}
        <div className="events">
          {errors.data?.map((e) => (
            <div key={e.id} className="event">
              <span className="muted small mono">run #{e.run_id}</span>
              <span className="muted small">{e.stage}</span>
              <span className="event-msg">{e.message}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
