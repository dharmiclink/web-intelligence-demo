import type { AnalyticsData, CaseDetail, CaseSummary, OverviewData, QueueDetail, URLSubmission } from "./types";

const LOCAL_API_BASE = "http://127.0.0.1:8000";
const STATIC_STORE_KEY = "web-intelligence-demo-static-store-v1";

type QueueListItem = {
  name: string;
  description: string;
  default_sla_hours: number;
  case_count: number;
  high_risk_count: number;
};

type DemoBundle = {
  generated_at: string;
  overview: OverviewData;
  analytics: AnalyticsData;
  cases: CaseSummary[];
  caseDetails: Record<string, CaseDetail>;
  queues: QueueListItem[];
  queueDetails: Record<string, QueueDetail>;
  urls: URLSubmission[];
};

type StaticOverlay = {
  urls: URLSubmission[];
  cases: CaseSummary[];
  caseDetails: Record<string, CaseDetail>;
};

type StaticState = {
  overview: OverviewData;
  analytics: AnalyticsData;
  cases: CaseSummary[];
  caseDetails: Record<string, CaseDetail>;
  queues: QueueListItem[];
  queueDetails: Record<string, QueueDetail>;
  urls: URLSubmission[];
};

let demoBundlePromise: Promise<DemoBundle> | null = null;

function isBrowser() {
  return typeof window !== "undefined";
}

function isLocalHostname() {
  if (!isBrowser()) {
    return false;
  }

  return ["localhost", "127.0.0.1"].includes(window.location.hostname);
}

function getConfiguredApiBase() {
  const envBase = import.meta.env.VITE_API_BASE?.replace(/\/+$/, "");
  if (envBase) {
    return envBase;
  }

  return isLocalHostname() ? LOCAL_API_BASE : "";
}

function shouldUseStaticDemo() {
  return getConfiguredApiBase() === "";
}

function buildApiUrl(path: string) {
  const base = getConfiguredApiBase();
  return base ? `${base}${path}` : path;
}

export function resolveAssetUrl(path: string) {
  if (!path || /^https?:\/\//.test(path) || path.startsWith("data:")) {
    return path;
  }

  const base = getConfiguredApiBase();
  return base && path.startsWith("/") ? `${base}${path}` : path;
}

async function loadDemoBundle(): Promise<DemoBundle> {
  if (!demoBundlePromise) {
    demoBundlePromise = fetch("/demo/demo-bundle.json").then(async (response) => {
      if (!response.ok) {
        throw new Error(`Static demo bundle failed to load: ${response.status}`);
      }
      return (await response.json()) as DemoBundle;
    });
  }

  return demoBundlePromise;
}

function readStaticOverlay(): StaticOverlay {
  if (!isBrowser()) {
    return { urls: [], cases: [], caseDetails: {} };
  }

  try {
    const raw = window.localStorage.getItem(STATIC_STORE_KEY);
    if (!raw) {
      return { urls: [], cases: [], caseDetails: {} };
    }

    const parsed = JSON.parse(raw) as Partial<StaticOverlay>;
    return {
      urls: Array.isArray(parsed.urls) ? parsed.urls : [],
      cases: Array.isArray(parsed.cases) ? parsed.cases : [],
      caseDetails: parsed.caseDetails && typeof parsed.caseDetails === "object" ? parsed.caseDetails : {},
    };
  } catch {
    return { urls: [], cases: [], caseDetails: {} };
  }
}

function writeStaticOverlay(overlay: StaticOverlay) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(STATIC_STORE_KEY, JSON.stringify(overlay));
}

function parseJsonBody<T>(body: BodyInit | null | undefined): T {
  if (!body || typeof body !== "string") {
    throw new Error("Static demo mode expects JSON string request bodies.");
  }

  return JSON.parse(body) as T;
}

function mergeById<T extends { id: number }>(base: T[], overlay: T[]) {
  const merged = new Map<number, T>();

  for (const item of base) {
    merged.set(item.id, item);
  }
  for (const item of overlay) {
    merged.set(item.id, item);
  }

  return Array.from(merged.values());
}

function sortByNewest<T>(items: T[], getTimestamp: (item: T) => string) {
  return [...items].sort((left, right) => {
    return new Date(getTimestamp(right)).getTime() - new Date(getTimestamp(left)).getTime();
  });
}

function getQueueMeta(bundle: DemoBundle, queueName: string) {
  return (
    bundle.queues.find((queue) => queue.name === queueName) ?? {
      name: queueName,
      description: "Advisory review queue for demo workflow handling.",
      default_sla_hours: 24,
      case_count: 0,
      high_risk_count: 0,
    }
  );
}

function buildQueueList(bundle: DemoBundle, cases: CaseSummary[]): QueueListItem[] {
  const grouped = new Map<string, CaseSummary[]>();
  for (const item of cases) {
    const current = grouped.get(item.queue_name) ?? [];
    current.push(item);
    grouped.set(item.queue_name, current);
  }

  return Array.from(grouped.entries())
    .map(([name, queueCases]) => {
      const meta = getQueueMeta(bundle, name);
      return {
        name,
        description: meta.description,
        default_sla_hours: meta.default_sla_hours,
        case_count: queueCases.length,
        high_risk_count: queueCases.filter((item) => item.risk_level === "High").length,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

function computeAverageReviewHours(cases: CaseSummary[], caseDetails: Record<string, CaseDetail>) {
  const durations: number[] = [];

  for (const item of cases) {
    const detail = caseDetails[String(item.id)];
    const firstReview = detail?.reviews?.[0];
    if (!firstReview) {
      continue;
    }

    const startedAt = new Date(item.submitted_at).getTime();
    const reviewedAt = new Date(firstReview.created_at).getTime();
    if (!Number.isNaN(startedAt) && !Number.isNaN(reviewedAt)) {
      durations.push((reviewedAt - startedAt) / 3_600_000);
    }
  }

  if (!durations.length) {
    return 0;
  }

  return Number((durations.reduce((sum, value) => sum + value, 0) / durations.length).toFixed(1));
}

function buildOverview(bundle: DemoBundle, urls: URLSubmission[], cases: CaseSummary[], caseDetails: Record<string, CaseDetail>, queues: QueueListItem[]): OverviewData {
  const suspiciousCount = cases.filter((item) => item.category !== "General commerce / benign").length;
  const targetedCount = cases.filter((item) => item.malaysia_targeted).length;
  const highRiskCount = cases.filter((item) => item.risk_level === "High").length;
  const avgReviewHours = computeAverageReviewHours(cases, caseDetails);

  const categoryDistribution = new Map<string, number>();
  const queueDistribution = new Map<string, number>();
  for (const item of cases) {
    categoryDistribution.set(item.category, (categoryDistribution.get(item.category) ?? 0) + 1);
    queueDistribution.set(item.queue_name, (queueDistribution.get(item.queue_name) ?? 0) + 1);
  }

  return {
    ...bundle.overview,
    kpis: [
      { label: "URLs Scanned", value: `${urls.length.toLocaleString()}`, delta: "+12% week on week", tone: "neutral" },
      { label: "Suspicious Sites Detected", value: `${suspiciousCount.toLocaleString()}`, delta: "Rules-led triage active", tone: "alert" },
      { label: "Target-Market Sites Detected", value: `${targetedCount.toLocaleString()}`, delta: "Transparent market scoring", tone: "positive" },
      { label: "High-Risk Cases", value: `${highRiskCount.toLocaleString()}`, delta: "Executive review priority", tone: "alert" },
      { label: "Average Analyst Review Time", value: `${avgReviewHours.toFixed(1)} hrs`, delta: "POC operating baseline", tone: "neutral" },
    ],
    category_distribution: Array.from(categoryDistribution.entries()).map(([label, value]) => ({ label, value })),
    queue_distribution: Array.from(queueDistribution.entries()).map(([label, value]) => ({ label, value })),
    recent_cases: cases.slice(0, 8),
    agency_workload: queues.map((queue) => {
      const queueCases = cases.filter((item) => item.queue_name === queue.name);
      return {
        name: queue.name,
        description: queue.description,
        pending: queueCases.filter((item) => item.status === "new" || item.status === "pending-review").length,
        in_review: queueCases.filter((item) => item.status === "in-review").length,
        high_risk: queueCases.filter((item) => item.risk_level === "High").length,
        average_age_hours: Number(
          (
            queueCases.reduce((sum, item) => sum + (Date.now() - new Date(item.submitted_at).getTime()) / 3_600_000, 0) /
            Math.max(queueCases.length, 1)
          ).toFixed(1),
        ),
      };
    }),
  };
}

function buildStaticState(bundle: DemoBundle, overlay: StaticOverlay): StaticState {
  const urls = sortByNewest(mergeById(bundle.urls, overlay.urls), (item) => item.submitted_at);
  const cases = sortByNewest(mergeById(bundle.cases, overlay.cases), (item) => item.submitted_at);
  const caseDetails = { ...bundle.caseDetails, ...overlay.caseDetails };
  const queues = buildQueueList(bundle, cases);
  const queueDetails = Object.fromEntries(
    queues.map((queue) => [
      queue.name,
      {
        name: queue.name,
        description: queue.description,
        default_sla_hours: queue.default_sla_hours,
        cases: sortByNewest(
          cases.filter((item) => item.queue_name === queue.name),
          (item) => item.submitted_at,
        ),
      },
    ]),
  );

  return {
    overview: buildOverview(bundle, urls, cases, caseDetails, queues),
    analytics: bundle.analytics,
    cases,
    caseDetails,
    queues,
    queueDetails,
    urls,
  };
}

function toSummary(detail: CaseDetail): CaseSummary {
  return {
    id: detail.id,
    case_reference: detail.case_reference,
    url: detail.url,
    submitted_at: detail.submitted_at,
    category: detail.category,
    confidence: detail.confidence,
    risk_level: detail.risk_level,
    malaysia_targeting_score: detail.malaysia_targeting_score,
    malaysia_targeted: detail.malaysia_targeted,
    queue_name: detail.queue_name,
    status: detail.status,
    analyst_owner: detail.analyst_owner,
    summary: detail.summary,
    evidence_bullets: detail.evidence_bullets,
    reasoning: detail.reasoning,
  };
}

function inferCaseProfile(url: string) {
  const lower = url.toLowerCase();

  if (/(pharmacy|pharma|med|rx|pill|supplement|apotek)/.test(lower)) {
    return {
      category: "Illegal or suspicious pharmacy",
      confidence: 0.88,
      riskLevel: "High",
      queueName: "Ministry of Health review queue",
      targetScore: 74,
      targeted: true,
      reasonCodes: ["PHARMACY_KEYWORDS", "OTC_PROMOTION", "LOCAL_CONTACT_CLAIM"],
      evidence: [
        "Medicinal or supplement product language appears in the submitted URL pattern.",
        "Promotional structure suggests direct-to-consumer sales rather than informational content.",
        "Target-market scoring remains above the advisory routing threshold.",
      ],
      entities: ["MYR", "+60", "Consumer delivery"],
      keywords: ["pharmacy", "supplement", "delivery", "offer"],
      reasoning:
        "Rule-based screening identified commercial medicine-related cues and escalated the case to a health-led review queue.",
    };
  }

  if (/(bet|casino|slot|jackpot|poker|wager|odds|gambling)/.test(lower)) {
    return {
      category: "Gambling",
      confidence: 0.91,
      riskLevel: "High",
      queueName: "Police review queue",
      targetScore: 69,
      targeted: true,
      reasonCodes: ["GAMBLING_TERMS", "PROMOTIONAL_ODDS_PATTERN", "TARGET_MARKET_MARKERS"],
      evidence: [
        "Betting or wagering terminology appears in the URL structure.",
        "The domain pattern suggests direct promotional acquisition activity.",
        "Target-market cues remain sufficiently strong for queue routing.",
      ],
      entities: ["Promotions", "Wallet top-up", "Campaign banner"],
      keywords: ["bet", "bonus", "odds", "wallet"],
      reasoning:
        "Keyword and pattern matching align with gambling-related promotional content, so the case is routed for police-led review.",
    };
  }

  if (/(adult|escort|xxx|18\+|cam|nsfw)/.test(lower)) {
    return {
      category: "Adult content",
      confidence: 0.84,
      riskLevel: "High",
      queueName: "Police review queue",
      targetScore: 63,
      targeted: true,
      reasonCodes: ["ADULT_TERMS", "EXPLICIT_PROMOTION_PATTERN", "AUDIENCE_TARGETING"],
      evidence: [
        "Adult-oriented terms are visible in the submitted domain or path.",
        "Commercial acquisition wording suggests public-facing promotion.",
        "The site registers target-market indicators above the review threshold.",
      ],
      entities: ["18+", "Subscription", "Consumer targeting"],
      keywords: ["adult", "exclusive", "subscription", "access"],
      reasoning:
        "The submission contains adult-content indicators and remains in scope for placeholder law-enforcement review handling.",
    };
  }

  if (/(shop|store|market|cart|boutique|retail)/.test(lower)) {
    return {
      category: "General commerce / benign",
      confidence: 0.67,
      riskLevel: "Low",
      queueName: "MCMC review queue",
      targetScore: 41,
      targeted: false,
      reasonCodes: ["COMMERCE_PATTERN", "LOW_RISK_MARKETING"],
      evidence: [
        "The URL structure resembles general commerce rather than regulated content.",
        "No elevated-risk keywords were detected in the initial pattern review.",
        "The case stays available for manual confirmation if new evidence emerges.",
      ],
      entities: ["Storefront", "Product catalogue"],
      keywords: ["shop", "store", "catalogue", "offer"],
      reasoning:
        "The current pattern set points to low-risk commerce, so the case remains as decision-support only with standard review routing.",
    };
  }

  return {
    category: "Unknown / needs review",
    confidence: 0.58,
    riskLevel: "Medium",
    queueName: "MCMC review queue",
    targetScore: 55,
    targeted: false,
    reasonCodes: ["LIMITED_CONTENT_CONTEXT", "MANUAL_VALIDATION_REQUIRED"],
    evidence: [
      "The submitted URL does not strongly align to any single in-scope category.",
      "Available signals are sufficient for review intake but not for a high-confidence determination.",
      "Manual verification is recommended before any operational follow-up.",
    ],
    entities: ["Unclassified site pattern"],
    keywords: ["review", "screening", "manual"],
    reasoning:
      "The initial pass found ambiguous indicators, so the case remains in an analyst-led review state until further evidence is collected.",
  };
}

function createSignalRows(profile: ReturnType<typeof inferCaseProfile>) {
  return [
    { label: "Local pricing markers", points: profile.targeted ? 24 : 12, evidence: profile.targeted ? "MYR-style market pricing reference inferred from pattern set." : "No strong local pricing marker detected." },
    { label: "Consumer targeting cues", points: profile.targeted ? 20 : 14, evidence: "Promotional copy pattern indicates consumer-oriented positioning." },
    { label: "Regional contact signals", points: profile.targeted ? 18 : 9, evidence: profile.targeted ? "Contact and fulfillment cues align with domestic targeting." : "Contact signals remain weak or incomplete." },
  ];
}

function buildStaticCase(state: StaticState, submissionId: number) {
  const submission = state.urls.find((item) => item.id === submissionId);
  if (!submission) {
    throw new Error("Submission not found");
  }

  const existing = state.cases.find((item) => item.url === submission.url);
  if (existing) {
    return { caseId: existing.id, overlay: null as StaticOverlay | null };
  }

  const template = state.caseDetails[String(state.cases[0]?.id)];
  if (!template) {
    throw new Error("Static demo bundle does not contain a case template.");
  }

  const profile = inferCaseProfile(submission.url);
  const nextCaseId = Math.max(0, ...state.cases.map((item) => item.id)) + 1;
  const createdAt = new Date().toISOString();
  const host = submission.url.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const signals = createSignalRows(profile);

  const detail: CaseDetail = {
    ...template,
    id: nextCaseId,
    case_reference: `WEB-INT-${String(nextCaseId).padStart(4, "0")}`,
    url: submission.url,
    final_url: submission.url.startsWith("http") ? submission.url : `https://${host}`,
    title: `Automated assessment for ${host}`,
    submitted_at: submission.submitted_at,
    category: profile.category,
    confidence: profile.confidence,
    risk_level: profile.riskLevel,
    malaysia_targeting_score: profile.targetScore,
    malaysia_targeted: profile.targeted,
    queue_name: profile.queueName,
    status: "new",
    analyst_owner: null,
    summary: `Automated intake completed for ${host}. The submission is routed as ${profile.category.toLowerCase()} for decision-support review.`,
    evidence_bullets: profile.evidence,
    reasoning: profile.reasoning,
    site_summary: `Demo-mode analysis captured a plausible evidence snapshot for ${host} using the configured rules engine.`,
    html_excerpt: `Demo-mode classification output for ${submission.url}. Further validation depends on live crawling in a full deployment.`,
    classification: {
      category: profile.category,
      confidence: profile.confidence,
      risk_level: profile.riskLevel,
      reason_codes: profile.reasonCodes,
      needs_review: profile.category === "Unknown / needs review",
      explanation: profile.reasoning,
    },
    malaysia_targeting: {
      score: profile.targetScore,
      targeted: profile.targeted,
      top_signals: signals,
      explanation: profile.targeted
        ? "Transparent signal aggregation indicates the site appears oriented to the monitored target market."
        : "Observed signals remain below the target-market routing threshold.",
    },
    targeting_model: {
      threshold: 60,
      score: profile.targetScore,
      targeted: profile.targeted,
      decision_rule: "Flag as target-market oriented when the weighted signal score reaches 60 or above.",
      signal_rows: signals.map((signal) => ({
        label: signal.label,
        points: signal.points,
        evidence: signal.evidence,
        contribution: `${signal.points} point contribution`,
      })),
    },
    features: {
      ...template.features,
      primary_language: profile.targeted ? "English / Malay mixed" : "English",
      malaysia_signals: signals.map((signal) => signal.label),
      indicators: profile.reasonCodes,
      keywords: profile.keywords,
      extracted_entities: profile.entities,
      pricing_markers: profile.targeted ? ["MYR"] : [],
    },
    timeline: [
      { stage: "URL intake", status: "completed", time: createdAt, detail: "Submission added to the advisory intake queue." },
      { stage: "Crawl", status: "completed", time: createdAt, detail: "Static demo mode generated a representative crawl summary." },
      { stage: "Feature extraction", status: "completed", time: createdAt, detail: "Category indicators and target-market cues were extracted." },
      { stage: "Classification", status: "completed", time: createdAt, detail: `Rules engine assigned ${profile.category}.` },
      { stage: "Target-market scoring", status: "completed", time: createdAt, detail: `Score computed at ${profile.targetScore}/100.` },
      { stage: "Case generation", status: "completed", time: createdAt, detail: "Analyst-facing evidence pack created." },
      { stage: "Routing", status: "completed", time: createdAt, detail: `Placeholder routing recommendation: ${profile.queueName}.` },
    ],
    routing_reason: `The case maps to ${profile.queueName} because the current signals align most closely with ${profile.category.toLowerCase()} handling.`,
    routing_policy: {
      recommended_queue: profile.queueName,
      policy_steps: [
        { title: "Category alignment", detail: `The strongest rule match is ${profile.category.toLowerCase()}.` },
        {
          title: "Target-market context",
          detail: profile.targeted
            ? "Observed market signals exceed the routing threshold and support priority handling."
            : "Observed market signals remain moderate, so routing remains advisory.",
        },
        { title: "Operational queue", detail: `The placeholder workflow recommends ${profile.queueName} for the next review step.` },
      ],
    },
    recommended_action: "Decision-support only. Analyst confirmation is required before any follow-up workflow.",
    reviews: [],
  };

  const updatedUrl: URLSubmission = { ...submission, status: "completed" };
  const summary = toSummary(detail);
  const overlay = readStaticOverlay();

  return {
    caseId: nextCaseId,
    overlay: {
      urls: [...overlay.urls.filter((item) => item.id !== updatedUrl.id), updatedUrl],
      cases: [...overlay.cases.filter((item) => item.id !== summary.id), summary],
      caseDetails: { ...overlay.caseDetails, [String(detail.id)]: detail },
    },
  };
}

async function requestStatic<T>(path: string, init?: RequestInit): Promise<T> {
  const bundle = await loadDemoBundle();
  const method = (init?.method ?? "GET").toUpperCase();
  const url = new URL(path, "https://demo.local");
  const overlay = readStaticOverlay();
  const state = buildStaticState(bundle, overlay);

  if (method === "GET" && url.pathname === "/stats/overview") {
    return state.overview as T;
  }

  if (method === "GET" && url.pathname === "/stats/analytics") {
    return state.analytics as T;
  }

  if (method === "GET" && url.pathname === "/cases") {
    let results = state.cases;
    const queue = url.searchParams.get("queue");
    const category = url.searchParams.get("category");
    const status = url.searchParams.get("status");
    const query = url.searchParams.get("query");
    const limit = Number(url.searchParams.get("limit") ?? results.length);

    if (queue) {
      results = results.filter((item) => item.queue_name === queue);
    }
    if (category) {
      results = results.filter((item) => item.category === category);
    }
    if (status) {
      results = results.filter((item) => item.status === status);
    }
    if (query) {
      const lowerQuery = query.toLowerCase();
      results = results.filter((item) => item.url.toLowerCase().includes(lowerQuery) || item.summary.toLowerCase().includes(lowerQuery));
    }

    return results.slice(0, limit) as T;
  }

  if (method === "GET" && url.pathname.startsWith("/cases/")) {
    const caseId = url.pathname.replace("/cases/", "");
    const detail = state.caseDetails[caseId];
    if (!detail) {
      throw new Error(`Case not found: ${caseId}`);
    }
    return detail as T;
  }

  if (method === "GET" && url.pathname === "/queues") {
    return state.queues as T;
  }

  if (method === "GET" && url.pathname.startsWith("/queues/")) {
    const queueName = decodeURIComponent(url.pathname.replace("/queues/", ""));
    const queue = state.queueDetails[queueName];
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }
    return queue as T;
  }

  if (method === "GET" && url.pathname === "/urls") {
    return state.urls.slice(0, Number(url.searchParams.get("limit") ?? state.urls.length)) as T;
  }

  if (method === "POST" && url.pathname === "/urls") {
    const payload = parseJsonBody<{ url: string; source: string; notes?: string }>(init?.body);
    const existing = state.urls.find((item) => item.url === payload.url);
    if (existing) {
      return { id: existing.id } as T;
    }

    const nextId = Math.max(0, ...state.urls.map((item) => item.id)) + 1;
    const overlayUpdate: StaticOverlay = {
      ...overlay,
      urls: [
        ...overlay.urls.filter((item) => item.id !== nextId),
        {
          id: nextId,
          url: payload.url,
          source: payload.source,
          status: "pending",
          submitted_at: new Date().toISOString(),
        },
      ],
    };
    writeStaticOverlay(overlayUpdate);
    return { id: nextId } as T;
  }

  if (method === "POST" && url.pathname === "/urls/bulk") {
    const payload = parseJsonBody<{ urls: string[]; source: string }>(init?.body);
    let nextId = Math.max(0, ...state.urls.map((item) => item.id));
    const seen = new Set(state.urls.map((item) => item.url));
    const created: URLSubmission[] = [];

    for (const submittedUrl of payload.urls) {
      if (seen.has(submittedUrl)) {
        continue;
      }
      seen.add(submittedUrl);
      nextId += 1;
      created.push({
        id: nextId,
        url: submittedUrl,
        source: payload.source,
        status: "pending",
        submitted_at: new Date().toISOString(),
      });
    }

    writeStaticOverlay({
      ...overlay,
      urls: [...overlay.urls, ...created],
    });

    return { created: created.length, ids: created.map((item) => item.id) } as T;
  }

  if (method === "POST" && url.pathname.startsWith("/analyze/")) {
    const submissionId = Number(url.pathname.replace("/analyze/", ""));
    const result = buildStaticCase(state, submissionId);
    if (result.overlay) {
      writeStaticOverlay(result.overlay);
    }
    return { case_id: result.caseId } as T;
  }

  if (method === "PATCH" && url.pathname.startsWith("/cases/") && url.pathname.endsWith("/review")) {
    const caseId = Number(url.pathname.replace("/cases/", "").replace("/review", ""));
    const payload = parseJsonBody<{ reviewer_name: string; review_status: string; notes: string; analyst_owner?: string }>(init?.body);
    const detail = state.caseDetails[String(caseId)];

    if (!detail) {
      throw new Error(`Case not found: ${caseId}`);
    }

    const updatedDetail: CaseDetail = {
      ...detail,
      status: payload.review_status,
      analyst_owner: payload.analyst_owner ?? detail.analyst_owner,
      reviews: [
        ...detail.reviews,
        {
          reviewer_name: payload.reviewer_name,
          review_status: payload.review_status,
          notes: payload.notes,
          created_at: new Date().toISOString(),
        },
      ],
    };

    writeStaticOverlay({
      ...overlay,
      cases: [...overlay.cases.filter((item) => item.id !== caseId), toSummary(updatedDetail)],
      caseDetails: { ...overlay.caseDetails, [String(caseId)]: updatedDetail },
    });

    return { message: "Review updated" } as T;
  }

  if (method === "POST" && url.pathname === "/demo/seed") {
    writeStaticOverlay({ urls: [], cases: [], caseDetails: {} });
    return { message: "Static demo state reset", count: bundle.urls.length } as T;
  }

  throw new Error(`Static demo mode does not support ${method} ${path}`);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (shouldUseStaticDemo()) {
    return requestStatic<T>(path, init);
  }

  try {
    const headers = new Headers(init?.headers ?? undefined);
    if (init?.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(buildApiUrl(path), {
      ...init,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    return response.json() as Promise<T>;
  } catch {
    return requestStatic<T>(path, init);
  }
}

export const api = {
  getOverview: () => request<OverviewData>("/stats/overview"),
  getAnalytics: () => request<AnalyticsData>("/stats/analytics"),
  getCases: (params?: URLSearchParams) => request<CaseSummary[]>(`/cases${params ? `?${params.toString()}` : ""}`),
  getCase: (id: string) => request<CaseDetail>(`/cases/${id}`),
  getQueues: () => request<QueueListItem[]>("/queues"),
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
