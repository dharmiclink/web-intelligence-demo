import { ArrowRight, Blocks, ClipboardCheck, Landmark, Shield, Waypoints } from "lucide-react";

import { SectionHeader } from "../components/section-header";
import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";

const roadmap = [
  {
    phase: "Phase 1",
    title: "Proof of concept",
    detail: "Demonstrate explainable classification, target-market scoring, and queue routing across a limited synthetic dataset.",
  },
  {
    phase: "Phase 2",
    title: "Operational pilot",
    detail: "Expand analyst workflows, connect sanctioned data sources, and validate governance with selected agency users.",
  },
  {
    phase: "Phase 3",
    title: "Production hardening",
    detail: "Introduce controlled connectors, audit retention, role-based access, and measurable service-level operating procedures.",
  },
];

export function ProposalPage() {
  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Proposal And Architecture"
        title="POC Scope, Architecture, And Governance Model"
        description="Presentation-grade materials for steering committees, technical review panels, and policy stakeholders evaluating a jurisdiction-focused compliance intelligence platform."
      />

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <Blocks className="h-5 w-5 text-accent" />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Solution objectives</p>
              <h2 className="mt-1 font-display text-2xl font-bold text-ink">Proposal scope</h2>
            </div>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <ProposalPanel title="Operational clarity" copy="Show how suspicious URLs move from intake to evidence-backed case review without implying automated enforcement." />
            <ProposalPanel title="Target-market transparency" copy="Use a transparent scoring model with visible signals such as MYR pricing, Malay language, shipping references, and contact markers." />
            <ProposalPanel title="Cross-agency routing" copy="Demonstrate queue assignment into Ministry of Health, Customs, Police, and MCMC style review lanes." />
            <ProposalPanel title="Auditability by design" copy="Every stage surfaces reasoning, evidence, and timestamped workflow history for stakeholder review." />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <Waypoints className="h-5 w-5 text-accent" />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">High-level workflow</p>
              <h2 className="mt-1 font-display text-2xl font-bold text-ink">Operating sequence</h2>
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            {[
              "URL intake",
              "Crawl and content capture",
              "Feature extraction",
              "Explainable classification",
              "Target-market scoring",
              "Case summary generation",
              "Agency queue routing",
            ].map((step, index) => (
              <div key={step} className="flex items-center gap-3 rounded-2xl border border-line bg-canvas/70 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">
                  {index + 1}
                </div>
                <p className="font-medium text-ink">{step}</p>
                {index < 6 ? <ArrowRight className="ml-auto h-4 w-4 text-slate-400" /> : null}
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <Landmark className="h-5 w-5 text-accent" />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Architecture</p>
              <h2 className="mt-1 font-display text-2xl font-bold text-ink">Reference architecture</h2>
            </div>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-4">
            <ArchitectureColumn
              title="Presentation layer"
              items={["Executive dashboard", "Queue views", "Case review", "Proposal materials"]}
            />
            <ArchitectureColumn
              title="Application services"
              items={["Intake orchestration", "Classification engine", "Target-market scorer", "Routing policy service"]}
            />
            <ArchitectureColumn
              title="Data layer"
              items={["SQLite demo store", "Analytics snapshots", "Evidence timeline", "Review records"]}
            />
            <ArchitectureColumn
              title="Governance controls"
              items={["Audit trail", "Role placeholders", "Config-driven rules", "Decision-support framing"]}
            />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-accent" />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Governance principles</p>
              <h2 className="mt-1 font-display text-2xl font-bold text-ink">Explainability and safeguards</h2>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {[
              "Automated findings are advisory only and explicitly framed as analyst decision-support.",
              "No blocking, takedown, or law-enforcement action is automated in the proposal workflow.",
              "Placeholder escalation logic is clearly labeled where cross-agency follow-up is discussed.",
              "Signal-driven classification is transparent and can be tuned under policy governance.",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-line bg-canvas/70 p-4 text-sm leading-6 text-slate-700">
                {item}
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="h-5 w-5 text-accent" />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Operating model</p>
              <h2 className="mt-1 font-display text-2xl font-bold text-ink">Sample review model</h2>
            </div>
          </div>
          <div className="mt-5 space-y-4">
            <ProposalPanel title="Tier 1 triage" copy="Intake analyst validates URL quality, evidence completeness, and suggested queue alignment." />
            <ProposalPanel title="Tier 2 specialist review" copy="Receiving agency reviews category rationale, target-market evidence, and operating context." />
            <ProposalPanel title="Governance oversight" copy="Programme office monitors false positive rates, policy changes, and inter-agency service metrics." />
          </div>
        </Card>

        <Card className="p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Phased rollout roadmap</p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {roadmap.map((item) => (
              <div key={item.phase} className="rounded-3xl border border-line bg-canvas/70 p-5">
                <Badge>{item.phase}</Badge>
                <p className="mt-4 font-display text-xl font-bold text-ink">{item.title}</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.detail}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}

function ProposalPanel({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="rounded-3xl border border-line bg-canvas/70 p-5">
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-3 text-sm leading-6 text-slate-600">{copy}</p>
    </div>
  );
}

function ArchitectureColumn({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-3xl border border-line bg-canvas/70 p-5">
      <p className="font-display text-xl font-bold text-ink">{title}</p>
      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <div key={item} className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
