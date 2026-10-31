import { useState } from "react";
import { api } from "../api";
import { Badge, duration, Empty, fmtDate, Loading, RUN_TONE, useAsync, type Tone } from "../ui";

const LEVEL_TONE: Record<string, Tone> = { info: "neutral", warning: "warn", error: "bad" };

function RunEvents({ id }: { id: number }) {
  const { data, error, loading } = useAsync(() => api.run(id), [id]);
  if (!data) return <Loading error={error} loading={loading} />;
  if (!data.events.length) return <div className="muted small pad">No events logged.</div>;
  return (
    <div className="events">
      {data.events.map((e) => (
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
                </span>
              </button>
              {openId === r.id && <RunEvents id={r.id} />}
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
