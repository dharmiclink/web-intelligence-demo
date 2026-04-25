import { CheckCircle2, CircleDashed, ScanSearch } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { LoadingPanel } from "../components/loading-panel";
import { SectionHeader } from "../components/section-header";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { api, resolveAssetUrl } from "../lib/api";
import type { CaseDetail, CaseSummary } from "../lib/types";
import { formatDate } from "../lib/utils";

export function PipelinePage() {
  const [cases, setCases] = useState<CaseSummary[] | null>(null);
  const [selected, setSelected] = useState<CaseDetail | null>(null);

  useEffect(() => {
    api.getCases(new URLSearchParams({ limit: "12" })).then((items) => {
      setCases(items);
      if (items[0]) {
        api.getCase(String(items[0].id)).then(setSelected);
      }
    });
  }, []);

  if (!cases || !selected) {
    return <LoadingPanel label="Preparing pipeline walkthrough..." />;
  }

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Analysis Pipeline"
        title="Explainable End-To-End Review Workflow"
        description="This view is tuned for proposal walkthroughs and technical committee reviews. Each stage surfaces traceable evidence, extracted indicators, and advisory routing logic."
        action={
          <div className="flex gap-3">
            <select
              className="rounded-full border border-line bg-white px-4 py-2 text-sm text-slate-700"
              value={selected.id}
              onChange={(event) => {
                api.getCase(event.target.value).then(setSelected);
              }}
            >
              {cases.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.case_reference}
                </option>
              ))}
            </select>
            <Link
              to={`/cases/${selected.id}`}
              className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-ink ring-1 ring-line transition hover:bg-canvas"
            >
              Open case
            </Link>
          </div>
        }
      />

      <Card className="p-6">
        <div className="grid gap-4 lg:grid-cols-7">
          {selected.timeline.map((item, index) => (
            <div key={item.stage} className="relative">
              <div className="h-full rounded-3xl border border-line bg-white p-4">
                <div className="flex items-center justify-between">
                  <Badge>{item.stage}</Badge>
                  {item.status === "completed" ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : (
                    <CircleDashed className="h-5 w-5 text-slate-400" />
                  )}
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-600">{item.detail}</p>
                <p className="mt-4 text-xs uppercase tracking-[0.14em] text-slate-400">{formatDate(item.time)}</p>
              </div>
              {index !== selected.timeline.length - 1 ? (
                <div className="absolute right-[-12px] top-1/2 hidden h-px w-6 bg-line lg:block" />
              ) : null}
            </div>
          ))}
        </div>
      </Card>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-line px-6 py-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Selected case</p>
            <h2 className="mt-1 font-display text-2xl font-bold text-ink">{selected.title}</h2>
          </div>
          <img src={resolveAssetUrl(selected.screenshot_url)} alt={selected.title} className="h-[320px] w-full object-cover" />
          <div className="grid gap-4 p-6 md:grid-cols-2">
            <div className="rounded-2xl border border-line bg-canvas/60 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Detected category</p>
              <p className="mt-2 font-semibold text-ink">{selected.classification.category}</p>
            </div>
            <div className="rounded-2xl border border-line bg-canvas/60 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Target-market score</p>
              <p className="mt-2 font-semibold text-ink">{selected.malaysia_targeting.score}/100</p>
            </div>
          </div>
        </Card>

        <div className="grid gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <ScanSearch className="h-5 w-5 text-accent" />
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Extracted signals</p>
                <h3 className="mt-1 font-display text-xl font-bold text-ink">Observed evidence set</h3>
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {selected.malaysia_targeting.top_signals.map((signal) => (
                <div key={signal.label} className="rounded-2xl border border-line bg-canvas/70 p-4">
                  <p className="font-semibold text-ink">{signal.label}</p>
                  <p className="mt-2 text-sm text-slate-600">Evidence: {signal.evidence}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-400">{signal.points} points</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Routing recommendation</p>
            <h3 className="mt-2 font-display text-xl font-bold text-ink">{selected.queue_name}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">{selected.routing_reason}</p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-line bg-canvas/70 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Why flagged</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{selected.classification.explanation}</p>
              </div>
              <div className="rounded-2xl border border-line bg-canvas/70 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Action framing</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{selected.recommended_action}</p>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
