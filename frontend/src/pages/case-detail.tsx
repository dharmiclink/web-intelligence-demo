import { ClipboardList, Eye, FileStack, Landmark, TimerReset } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { LoadingPanel } from "../components/loading-panel";
import { SectionHeader } from "../components/section-header";
import { StatusPill } from "../components/status-pill";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { api, resolveAssetUrl } from "../lib/api";
import type { CaseDetail } from "../lib/types";
import { formatDate, formatPercent } from "../lib/utils";

export function CaseDetailPage() {
  const { id = "1" } = useParams();
  const [data, setData] = useState<CaseDetail | null>(null);
  const [reviewerName, setReviewerName] = useState("Lead Analyst");
  const [reviewStatus, setReviewStatus] = useState("in-review");
  const [reviewNotes, setReviewNotes] = useState("Analyst validation in progress.");
  const [analystOwner, setAnalystOwner] = useState("Assigned analyst");

  async function loadCase() {
    setData(await api.getCase(id));
  }

  useEffect(() => {
    loadCase();
  }, [id]);

  async function submitReview(event: FormEvent) {
    event.preventDefault();
    await api.updateReview(Number(id), {
      reviewer_name: reviewerName,
      review_status: reviewStatus,
      notes: reviewNotes,
      analyst_owner: analystOwner,
    });
    await loadCase();
  }

  if (!data) {
    return <LoadingPanel label="Loading case detail..." />;
  }

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Case Detail"
        title={data.case_reference}
        description="Detailed evidence pack for analyst review, category rationale, target-market signals, and placeholder routing recommendation."
      />

      <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-line px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Captured preview</p>
                <h2 className="mt-1 font-display text-2xl font-bold text-ink">{data.title}</h2>
              </div>
              <div className="flex gap-2">
                <StatusPill value={data.risk_level} />
                <StatusPill value={data.status} />
              </div>
            </div>
          </div>
          <img src={resolveAssetUrl(data.screenshot_url)} alt={data.title} className="h-[360px] w-full object-cover" />
          <div className="grid gap-4 p-6 md:grid-cols-2">
            <div className="rounded-2xl border border-line bg-canvas/70 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">URL</p>
              <p className="mt-2 break-all text-sm text-ink">{data.url}</p>
            </div>
            <div className="rounded-2xl border border-line bg-canvas/70 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Final URL</p>
              <p className="mt-2 break-all text-sm text-ink">{data.final_url}</p>
            </div>
          </div>
        </Card>

        <div className="grid gap-6">
          <Card className="p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Metric label="Detected category" value={data.category} icon={ClipboardList} />
              <Metric label="Confidence" value={formatPercent(data.confidence)} icon={Eye} />
              <Metric label="Target-market score" value={`${data.malaysia_targeting.score}/100`} icon={Landmark} />
              <Metric label="Recommended queue" value={data.queue_name} icon={FileStack} />
            </div>
          </Card>

          <Card className="p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Evidence summary</p>
            <div className="mt-4 space-y-3">
              {data.evidence_bullets.map((item) => (
                <div key={item} className="rounded-2xl border border-line bg-canvas/70 p-4 text-sm leading-6 text-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Indicators and rationale</p>
          <div className="mt-5 grid gap-4">
            <Panel label="Reason codes" values={data.classification.reason_codes} />
            <Panel label="Target-market signals" values={data.features.malaysia_signals} />
            <Panel label="Extracted entities" values={data.features.extracted_entities} />
            <Panel label="Keywords" values={data.features.keywords} />
          </div>
          <div className="mt-5 rounded-2xl border border-line bg-canvas/70 p-4 text-sm leading-6 text-slate-700">
            {data.reasoning}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <TimerReset className="h-5 w-5 text-accent" />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Review history</p>
              <h3 className="mt-1 font-display text-xl font-bold text-ink">Processing timeline and analyst notes</h3>
            </div>
          </div>
          <div className="mt-5 space-y-4">
            {data.timeline.map((item) => (
              <div key={`${item.stage}-${item.time}`} className="rounded-2xl border border-line bg-canvas/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{item.stage}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{item.detail}</p>
                  </div>
                  <Badge>{item.status}</Badge>
                </div>
                <p className="mt-3 text-xs uppercase tracking-[0.14em] text-slate-400">{formatDate(item.time)}</p>
              </div>
            ))}
            {data.reviews.map((review) => (
              <div key={`${review.reviewer_name}-${review.created_at}`} className="rounded-2xl border border-line bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-ink">{review.reviewer_name}</p>
                  <StatusPill value={review.review_status} />
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{review.notes}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.14em] text-slate-400">{formatDate(review.created_at)}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Target-market model</p>
          <div className="mt-5 space-y-4">
            <div className="rounded-3xl border border-line bg-canvas/70 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">Threshold and decision</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{data.targeting_model.decision_rule}</p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 text-right shadow-sm">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Score</p>
                  <p className="font-display text-2xl font-extrabold text-ink">
                    {data.targeting_model.score}/{data.targeting_model.threshold}
                  </p>
                </div>
              </div>
            </div>
            {data.targeting_model.signal_rows.map((signal) => (
              <div key={`${signal.label}-${signal.evidence}`} className="rounded-2xl border border-line bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold text-ink">{signal.label}</p>
                  <Badge>{signal.contribution}</Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">Observed evidence: {signal.evidence}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Routing policy logic</p>
          <div className="mt-5 space-y-4">
            <div className="rounded-3xl border border-line bg-canvas/70 p-5">
              <p className="font-semibold text-ink">Recommended queue</p>
              <p className="mt-2 font-display text-2xl font-bold text-ink">{data.routing_policy.recommended_queue}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{data.routing_reason}</p>
            </div>
            {data.routing_policy.policy_steps.map((step) => (
              <div key={step.title} className="rounded-2xl border border-line bg-white p-4">
                <p className="font-semibold text-ink">{step.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{step.detail}</p>
              </div>
            ))}
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
              {data.recommended_action}
            </div>
          </div>
        </Card>
      </section>

      <Card className="p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Review controls</p>
        <form className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_1fr] xl:grid-cols-[0.9fr_0.9fr_0.9fr_1.3fr_auto]" onSubmit={submitReview}>
          <Input value={reviewerName} onChange={(event) => setReviewerName(event.target.value)} placeholder="Reviewer name" />
          <Input value={analystOwner} onChange={(event) => setAnalystOwner(event.target.value)} placeholder="Analyst owner" />
          <select
            className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink"
            value={reviewStatus}
            onChange={(event) => setReviewStatus(event.target.value)}
          >
            <option value="pending-review">pending-review</option>
            <option value="in-review">in-review</option>
            <option value="escalation-placeholder">escalation-placeholder</option>
            <option value="closed">closed</option>
          </select>
          <Textarea value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} className="min-h-[54px]" />
          <Button className="self-start">Update review</Button>
        </form>
      </Card>
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof ClipboardList;
}) {
  return (
    <div className="rounded-2xl border border-line bg-canvas/70 p-4">
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-accent" />
        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
      </div>
      <p className="mt-3 text-lg font-semibold text-ink">{value}</p>
    </div>
  );
}

function Panel({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="rounded-2xl border border-line bg-canvas/70 p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {values.map((value) => (
          <Badge key={value}>{value}</Badge>
        ))}
      </div>
    </div>
  );
}
