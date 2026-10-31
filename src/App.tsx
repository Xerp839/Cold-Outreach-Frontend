import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError, getKey, setKey } from "./api";
import Drafts from "./pages/Drafts";
import Jobs from "./pages/Jobs";
import Overview from "./pages/Overview";
import Providers from "./pages/Providers";
import Runs from "./pages/Runs";

const TABS: [string, string][] = [
  ["overview", "Overview"],
  ["drafts", "Drafts"],
  ["jobs", "Jobs"],
  ["runs", "Runs & errors"],
  ["providers", "Providers"],
];

function useHashTab(): [string, (t: string) => void] {
  const read = () => {
    const h = window.location.hash.slice(1);
    return TABS.some(([k]) => k === h) ? h : "overview";
  };
  const [tab, setTab] = useState(read);
  useEffect(() => {
    const on = () => setTab(read());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return [tab, (t) => (window.location.hash = t)];
}

function Login({ onOk }: { onOk: () => void }) {
  const [value, setValue] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setKey(value.trim());
    try {
      await api.stats();
      onOk();
    } catch (e) {
      setKey("");
      setErr(e instanceof ApiError && e.status === 401 ? "Wrong key." : `Can't reach backend: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <form className="card stack" onSubmit={submit}>
        <h1>Outreach</h1>
        <p className="muted small">Enter the API_KEY from the backend's env.</p>
        <input type="password" autoFocus value={value} onChange={(e) => setValue(e.target.value)} placeholder="API key" />
        {err && <div className="notice notice-bad">{err}</div>}
        <button className="btn btn-primary" disabled={!value || busy}>
          {busy ? "Checking…" : "Open dashboard"}
        </button>
      </form>
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(() => Boolean(getKey()));
  const [tab, setTab] = useHashTab();

  if (!authed) return <Login onOk={() => setAuthed(true)} />;

  return (
    <div className="shell">
      <header className="topbar">
        <strong className="brand">Outreach</strong>
        <nav className="tabs">
          {TABS.map(([k, label]) => (
            <button key={k} className={tab === k ? "active" : ""} onClick={() => setTab(k)}>
              {label}
            </button>
          ))}
        </nav>
        <button
          className="btn btn-ghost small"
          onClick={() => {
            setKey("");
            setAuthed(false);
          }}
        >
          Log out
        </button>
      </header>
      <main className="content">
        {tab === "overview" && <Overview goTo={setTab} />}
        {tab === "drafts" && <Drafts />}
        {tab === "jobs" && <Jobs />}
        {tab === "runs" && <Runs />}
        {tab === "providers" && <Providers />}
      </main>
    </div>
  );
}
