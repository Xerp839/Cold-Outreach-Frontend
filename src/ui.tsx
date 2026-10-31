import { useCallback, useEffect, useState, type ReactNode } from "react";

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fn());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, loading, reload, setData };
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "-";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export function duration(start: string, end: string | null): string {
  const ms = (end ? new Date(end).getTime() : Date.now()) - new Date(start).getTime();
  const m = Math.floor(ms / 60000);
  return m ? `${m}m ${Math.floor((ms % 60000) / 1000)}s` : `${Math.floor(ms / 1000)}s`;
}

export type Tone = "neutral" | "good" | "warn" | "bad" | "info";

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export const RUN_TONE: Record<string, Tone> = { success: "good", partial: "warn", failed: "bad", running: "info" };

export function ScorePill({ score }: { score: number | null }) {
  if (score == null) return null;
  const tone: Tone = score >= 85 ? "good" : score >= 70 ? "info" : "neutral";
  return <Badge tone={tone}>{score}</Badge>;
}

export function Loading({ error, loading }: { error: string | null; loading: boolean }) {
  if (error) return <div className="notice notice-bad">{error}</div>;
  if (loading) return <div className="muted pad">Loading…</div>;
  return null;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
