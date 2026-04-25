import type { AnalyticsData, CaseDetail, CaseSummary, OverviewData, QueueDetail, URLSubmission } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  getOverview: () => request<OverviewData>("/stats/overview"),
  getAnalytics: () => request<AnalyticsData>("/stats/analytics"),
  getCases: (params?: URLSearchParams) => request<CaseSummary[]>(`/cases${params ? `?${params.toString()}` : ""}`),
  getCase: (id: string) => request<CaseDetail>(`/cases/${id}`),
  getQueues: () => request<Array<{ name: string; description: string; default_sla_hours: number; case_count: number; high_risk_count: number }>>("/queues"),
  getQueue: (name: string) => request<QueueDetail>(`/queues/${encodeURIComponent(name)}`),
  listUrls: () => request<URLSubmission[]>("/urls"),
  createUrl: (payload: { url: string; source: string; notes?: string }) =>
    request<{ id: number }>("/urls", { method: "POST", body: JSON.stringify(payload) }),
  createBulkUrls: (payload: { urls: string[]; source: string }) =>
    request<{ created: number; ids?: number[] }>("/urls/bulk", { method: "POST", body: JSON.stringify(payload) }),
  analyzeUrl: (id: number) => request<{ case_id: number }>("/analyze/" + id, { method: "POST" }),
  seedDemo: (payload: { count: number; reset: boolean }) =>
    request<{ message: string; count: number }>("/demo/seed", { method: "POST", body: JSON.stringify(payload) }),
  updateReview: (id: number, payload: { reviewer_name: string; review_status: string; notes: string; analyst_owner?: string }) =>
    request<{ message: string }>(`/cases/${id}/review`, { method: "PATCH", body: JSON.stringify(payload) }),
};

