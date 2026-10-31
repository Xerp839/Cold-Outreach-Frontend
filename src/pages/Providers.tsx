import { useState } from "react";
import { api } from "../api";
import { Badge, Empty, Loading, useAsync } from "../ui";

const ORDER = ["gemini", "groq", "apollo", "hunter"];
const ROLE: Record<string, string> = {
  gemini: "LLM · primary",
  groq: "LLM · fallback",
  apollo: "Contacts · primary",
  hunter: "Contacts · fallback",
};

export default function Providers() {
  const { data, error, loading } = useAsync(api.providers);
  const [gmail, setGmail] = useState<string | null>(null);

  async function testGmail() {
    setGmail("Checking…");
    try {
      const r = await api.checkGmail();
      setGmail(r.ok ? `Connected. Drafts folder: ${r.drafts_folder}` : `Failed: ${r.error}`);
    } catch (e) {
      setGmail(e instanceof Error ? e.message : String(e));
    }
  }

  if (!data) return <Loading error={error} loading={loading} />;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="stack">
      <div className="cards">
        {ORDER.map((p) => {
          const todayRow = data.usage.find((u) => u.provider === p && u.day === today);
          const configured = data.configured[p];
          return (
            <div key={p} className="card stat">
              <div className="row-between">
                <strong className="cap">{p}</strong>
                {!configured ? (
                  <Badge>no key</Badge>
                ) : todayRow?.exhausted ? (
                  <Badge tone="bad">exhausted today</Badge>
                ) : (
                  <Badge tone="good">ok</Badge>
                )}
              </div>
              <div className="muted small">{ROLE[p]}</div>
              <div className="stat-foot">
                {todayRow ? `${todayRow.calls} calls today, ${todayRow.failures} failed` : "no calls today"}
              </div>
              {p === "hunter" && data.hunter_account && (
                <div className="stat-foot">
                  Searches: {data.hunter_account.used ?? "?"} used / {data.hunter_account.available ?? "?"} per month
                </div>
              )}
            </div>
          );
        })}
      </div>

      <section className="card">
        <div className="row-between">
          <h2>Gmail</h2>
          <button className="btn" onClick={testGmail}>
            Test connection
          </button>
        </div>
        {gmail && <div className="notice">{gmail}</div>}
      </section>

      <section className="card">
        <h2>Usage, last 30 days</h2>
        {data.usage.length === 0 && <Empty>No calls yet.</Empty>}
        <div className="table">
          {data.usage.map((u) => (
            <div key={`${u.provider}-${u.day}`} className="table-row static">
              <span>{u.day}</span>
              <span className="cap">{u.provider}</span>
              <span>{u.calls} calls</span>
              <span className={u.failures ? "text-warn" : "muted"}>{u.failures} failed</span>
              {u.exhausted ? <Badge tone="bad">exhausted</Badge> : <span />}
              <span className="small muted ellipsis" title={u.last_error ?? ""}>
                {u.last_error ?? ""}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
