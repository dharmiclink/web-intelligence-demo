import { Building2, Clock3, Globe2, ShieldAlert, Waypoints } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { KpiCard } from "../components/kpi-card";
import { LoadingPanel } from "../components/loading-panel";
import { SectionHeader } from "../components/section-header";
import { StatusPill } from "../components/status-pill";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { api } from "../lib/api";
import type { OverviewData } from "../lib/types";
import { formatDate } from "../lib/utils";

const chartColors = ["#124c76", "#1f6a62", "#9a6b18", "#7f8da0", "#a13f36"];

export function OverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);

  useEffect(() => {
    api.getOverview().then(setData);
  }, []);

  if (!data) {
    return <LoadingPanel label="Loading executive overview..." />;
  }

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Executive Overview"
        title="National Digital Compliance Intelligence Platform"
        description="Proposal demonstration of a regulator-style workflow for detecting Malaysia-targeted sites, classifying regulatory risk, generating explainable case summaries, and routing cases to the relevant government review queue."
        action={
          <div className="flex flex-wrap gap-3">
            <div className="inline-flex items-center rounded-full bg-accentSoft px-5 py-2.5 text-sm font-semibold text-accent">
              Proposal-ready dashboard
            </div>
            <Link
              to="/proposal"
              className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-ink ring-1 ring-line transition hover:bg-canvas"
            >
              Review architecture
            </Link>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {data.kpis.map((item, index) => (
          <KpiCard key={item.label} item={item} index={index} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <Waypoints className="h-5 w-5 text-accent" />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Presentation sequence</p>
              <h2 className="mt-1 font-display text-2xl font-bold text-ink">Steering committee walkthrough</h2>
            </div>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            {[
              ["Overview", "Establish system scale, suspicious volume, and current routing posture."],
              ["Pipeline", "Show each analysis stage and the evidence generated at every step."],
              ["Case detail", "Explain category reasoning, Malaysia-targeting score, and analyst-ready summary."],
              ["Proposal", "Close with operating model, governance principles, and phased rollout."],
            ].map(([title, copy], index) => (
              <div key={title} className="rounded-3xl border border-line bg-canvas/70 p-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">
                  {index + 1}
                </div>
                <p className="mt-4 font-semibold text-ink">{title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{copy}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Scoring and routing policy</p>
          <div className="mt-5 space-y-4">
            <div className="rounded-3xl border border-line bg-canvas/70 p-5">
              <p className="font-semibold text-ink">Malaysia-targeting threshold</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                The current POC flags a site as Malaysia-targeted once transparent market-facing signals reach 35 points.
              </p>
            </div>
            <div className="rounded-3xl border border-line bg-canvas/70 p-5">
              <p className="font-semibold text-ink">Primary scoring signals</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                MYR pricing, Malay language, Malaysia shipping references, local phone patterns, state or city addresses, and domestic consumer positioning.
              </p>
            </div>
            <div className="rounded-3xl border border-line bg-canvas/70 p-5">
              <p className="font-semibold text-ink">Routing principle</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Category policy determines the default queue, with Malaysia-targeting and risk posture used as advisory routing context.
              </p>
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.95fr]">
        <Card className="p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Operational trend</p>
              <h2 className="mt-2 font-display text-2xl font-bold text-ink">Weekly Scan Trend</h2>
            </div>
            <Badge>Decision-support metrics</Badge>
          </div>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.weekly_scan_trend}>
                <CartesianGrid stroke="#e5edf4" vertical={false} />
                <XAxis dataKey="label" stroke="#718096" />
                <YAxis stroke="#718096" />
                <Tooltip />
                <Bar dataKey="scan_volume" fill="#124c76" radius={[10, 10, 0, 0]} />
                <Bar dataKey="suspicious_count" fill="#9a6b18" radius={[10, 10, 0, 0]} />
                <Bar dataKey="targeted_count" fill="#1f6a62" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="grid gap-6">
          <Card className="p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Category distribution</p>
            <div className="mt-5 h-[230px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.category_distribution} innerRadius={60} outerRadius={90} dataKey="value" nameKey="label">
                    {data.category_distribution.map((entry, index) => (
                      <Cell key={entry.label} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Malaysia-targeting evidence mix</p>
            <div className="mt-5 h-[230px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.targeting_signals} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid stroke="#e5edf4" horizontal={false} />
                  <XAxis type="number" stroke="#718096" />
                  <YAxis dataKey="label" type="category" stroke="#718096" width={150} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#1f6a62" radius={[0, 10, 10, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-line px-6 py-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Recent high-priority cases</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-ink">Case review queue</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-medium">Case</th>
                  <th className="px-6 py-4 font-medium">Category</th>
                  <th className="px-6 py-4 font-medium">Queue</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_cases.map((item) => (
                  <tr key={item.id} className="border-t border-line/70">
                    <td className="px-6 py-4">
                      <Link to={`/cases/${item.id}`} className="font-semibold text-ink hover:text-accent">
                        {item.case_reference}
                      </Link>
                      <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">{item.summary}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <StatusPill value={item.risk_level} />
                        <p className="text-slate-600">{item.category}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{item.queue_name}</td>
                    <td className="px-6 py-4">
                      <StatusPill value={item.status} />
                    </td>
                    <td className="px-6 py-4 text-slate-600">{formatDate(item.submitted_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="grid gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <Globe2 className="h-5 w-5 text-accent" />
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Queue assignment distribution</p>
                <h3 className="mt-1 font-display text-xl font-bold text-ink">Agency routing posture</h3>
              </div>
            </div>
            <div className="mt-6 space-y-4">
              {data.queue_distribution.map((item, index) => (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>{item.label}</span>
                    <span>{item.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${Math.max(14, item.value * 4)}px`,
                        backgroundColor: chartColors[index % chartColors.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-accent" />
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Agency workload summary</p>
                <h3 className="mt-1 font-display text-xl font-bold text-ink">Review queue readiness</h3>
              </div>
            </div>
            <div className="mt-5 space-y-4">
              {data.agency_workload.map((queue) => (
                <div key={queue.name} className="rounded-2xl border border-line bg-canvas/70 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-ink">{queue.name}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{queue.description}</p>
                    </div>
                    <ShieldAlert className="h-5 w-5 text-slate-400" />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-slate-500">Pending</p>
                      <p className="mt-1 font-display text-xl font-bold text-ink">{queue.pending}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">In review</p>
                      <p className="mt-1 font-display text-xl font-bold text-ink">{queue.in_review}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Avg age</p>
                      <p className="mt-1 flex items-center gap-1 font-display text-xl font-bold text-ink">
                        <Clock3 className="h-4 w-4 text-slate-400" />
                        {queue.average_age_hours}h
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
