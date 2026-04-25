export interface KPIBlock {
  label: string;
  value: string;
  delta: string;
  tone: string;
}

export interface ChartPoint {
  label: string;
  value: number;
}

export interface QueueSummary {
  name: string;
  description: string;
  pending: number;
  in_review: number;
  high_risk: number;
  average_age_hours: number;
}

export interface CaseSummary {
  id: number;
  case_reference: string;
  url: string;
  submitted_at: string;
  category: string;
  confidence: number;
  risk_level: string;
  malaysia_targeting_score: number;
  malaysia_targeted: boolean;
  queue_name: string;
  status: string;
  analyst_owner?: string | null;
  summary: string;
  evidence_bullets: string[];
  reasoning: string;
}

export interface CaseDetail extends CaseSummary {
  final_url: string;
  title: string;
  screenshot_url: string;
  site_summary: string;
  html_excerpt: string;
  classification: {
    category: string;
    confidence: number;
    risk_level: string;
    reason_codes: string[];
    needs_review: boolean;
    explanation: string;
  };
  malaysia_targeting: {
    score: number;
    targeted: boolean;
    top_signals: Array<{ label: string; points: number; evidence: string }>;
    explanation: string;
  };
  targeting_model: {
    threshold: number;
    score: number;
    targeted: boolean;
    decision_rule: string;
    signal_rows: Array<{ label: string; points: number; evidence: string; contribution: string }>;
  };
  features: {
    primary_language: string;
    malaysia_signals: string[];
    indicators: string[];
    keywords: string[];
    extracted_entities: string[];
    pricing_markers: string[];
  };
  timeline: Array<{ stage: string; status: string; time: string; detail: string }>;
  routing_reason: string;
  routing_policy: {
    recommended_queue: string;
    policy_steps: Array<{ title: string; detail: string }>;
  };
  recommended_action: string;
  reviews: Array<{
    reviewer_name: string;
    review_status: string;
    notes: string;
    created_at: string;
  }>;
}

export interface OverviewData {
  kpis: KPIBlock[];
  category_distribution: ChartPoint[];
  weekly_scan_trend: Array<Record<string, number | string>>;
  queue_distribution: ChartPoint[];
  targeting_signals: ChartPoint[];
  recent_cases: Array<CaseSummary>;
  agency_workload: QueueSummary[];
}

export interface AnalyticsData {
  scan_volume: Array<Record<string, number | string>>;
  suspicious_rate: Array<Record<string, number | string>>;
  category_trends: Array<Record<string, number | string>>;
  routing_trends: Array<Record<string, number | string>>;
  reviewer_outcomes: ChartPoint[];
  outcome_placeholders: ChartPoint[];
  targeting_patterns: ChartPoint[];
}

export interface QueueDetail {
  name: string;
  description: string;
  default_sla_hours: number;
  cases: CaseSummary[];
}

export interface URLSubmission {
  id: number;
  url: string;
  source: string;
  status: string;
  submitted_at: string;
}
