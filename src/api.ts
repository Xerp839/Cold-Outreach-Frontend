const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "http://localhost:8000";
const KEY_STORAGE = "outreach_api_key";

export function getKey(): string {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

export function setKey(key: string) {
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key);
    else localStorage.removeItem(KEY_STORAGE);
  } catch {
    /* private mode - key just won't persist */
  }
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", "X-API-Key": getKey(), ...init.headers },
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).detail ?? detail;
    } catch {
      /* not json */
    }
    throw new ApiError(res.status, typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return res.json() as Promise<T>;
}

// --------------------------------------------------------------------------- types

export type RunStats = Record<string, number>;

export interface Run {
  id: number;
  trigger: string;
  status: "running" | "success" | "partial" | "failed";
  started_at: string;
  finished_at: string | null;
  stats: RunStats;
  error: string | null;
}

export interface LogEvent {
  id: number;
  run_id?: number | null;
  job_id: number | null;
  stage: string;
  level: "info" | "warning" | "error";
  message: string;
  created_at: string;
}

export interface Stats {
  drafts_today: number;
  drafts_this_week: number;
  daily_target: number;
  drafts_by_status: Record<string, number>;
  jobs_by_status: Record<string, number>;
  reply_rate: number | null;
  total_drafts: number;
  linkedin_by_status: Record<string, number>;
  errors_last_7d: number;
  last_run: Run | null;
}

export interface Job {
  id: number;
  title: string;
  company: string;
  location: string | null;
  is_remote: boolean;
  source: string;
  url: string;
  apply_url: string | null;
  status: string;
  status_reason: string | null;
  score: number | null;
  summary: string | null;
  fit_points: string[];
  gaps: string[];
  experience: string | null;
  salary: string | null;
  posted_at: string | null;
  fetched_at: string;
}

export type DraftStatus = "drafted" | "sent" | "replied" | "skipped";

export interface Draft {
  id: number;
  status: DraftStatus;
  subject: string;
  body: string;
  to_email: string;
  contact_name: string | null;
  contact_title: string | null;
  contact_source: string | null;
  contact_confidence: number | null;
  created_at: string;
  status_changed_at: string | null;
  llm_provider: string | null;
  job: { id: number; title: string; company: string; url: string; score: number | null };
}

export type LinkedInStatus = "pending" | "sent" | "replied" | "skipped";

export interface LinkedInNote {
  id: number;
  status: LinkedInStatus;
  note: string;
  created_at: string;
  status_changed_at: string | null;
  llm_provider: string | null;
  max_chars: number;
  resume_url: string;
  portfolio_url: string;
  company_url: string;
  people_url: string;
  company_page_known: boolean;
  job: { id: number; title: string; company: string; url: string; score: number | null; status: string; location: string | null };
}

export interface Providers {
  configured: Record<string, boolean>;
  hunter_account: { used: number | null; available: number | null; reset_date: string | null } | null;
  usage: { provider: string; day: string; calls: number; failures: number; exhausted: boolean; last_error: string | null }[];
}

// --------------------------------------------------------------------------- calls

export const api = {
  stats: () => request<Stats>("/stats"),
  runs: () => request<Run[]>("/runs?limit=30"),
  run: (id: number) => request<Run & { events: LogEvent[] }>(`/runs/${id}`),
  startRun: () => request<{ run_id: number }>("/runs?trigger=manual", { method: "POST" }),
  drafts: (status?: string) => request<Draft[]>(`/drafts${status ? `?status=${status}` : ""}`),
  setDraftStatus: (id: number, status: DraftStatus) =>
    request<Draft>(`/drafts/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  linkedin: (status?: string) => request<LinkedInNote[]>(`/linkedin${status ? `?status=${status}` : ""}`),
  setLinkedInStatus: (id: number, status: LinkedInStatus) =>
    request<LinkedInNote>(`/linkedin/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  jobs: (params: Record<string, string>) => request<Job[]>(`/jobs?${new URLSearchParams(params)}`),
  setJobStatus: (id: number, status: string) =>
    request<Job>(`/jobs/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  providers: () => request<Providers>("/providers"),
  errors: () => request<LogEvent[]>("/events?level=error&limit=50"),
  checkGmail: () => request<{ ok: boolean; drafts_folder?: string; error?: string }>("/check/gmail"),
};
