import { AlertTriangle, Clock3, Search, ShieldCheck, UserRoundX } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { LoadingPanel } from "../components/loading-panel";
import { SectionHeader } from "../components/section-header";
import { StatusPill } from "../components/status-pill";
import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { api } from "../lib/api";
import type { QueueDetail } from "../lib/types";
import { formatDate } from "../lib/utils";

export function QueuePage() {
  const { name = "Ministry of Health review queue" } = useParams();
  const [data, setData] = useState<QueueDetail | null>(null);
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<"All" | "High" | "Medium" | "Low">("All");
  const [statusFilter, setStatusFilter] = useState<"All" | "new" | "pending-review" | "in-review" | "escalation-placeholder" | "closed">("All");
  const [targetedFilter, setTargetedFilter] = useState<"All" | "Targeted" | "Not Targeted">("All");

  useEffect(() => {
    api.getQueue(decodeURIComponent(name)).then(setData);
  }, [name]);

  const filtered = useMemo(() => {
    if (!data) {
      return [];
    }
    return data.cases.filter((item) => {
      const haystack = `${item.case_reference} ${item.url} ${item.summary}`.toLowerCase();
      const searchMatch = haystack.includes(search.toLowerCase());
      const riskMatch = riskFilter === "All" || item.risk_level === riskFilter;
      const statusMatch = statusFilter === "All" || item.status === statusFilter;
      const targetedMatch =
        targetedFilter === "All" ||
        (targetedFilter === "Targeted" && item.malaysia_targeted) ||
        (targetedFilter === "Not Targeted" && !item.malaysia_targeted);
      return searchMatch && riskMatch && statusMatch && targetedMatch;
    });
  }, [data, riskFilter, search, statusFilter, targetedFilter]);

  const metrics = useMemo(() => {
    if (!data) {
      return null;
    }

    const cases = data.cases;
    return {
      total: cases.length,
      highRisk: cases.filter((item) => item.risk_level === "High").length,
      inReview: cases.filter((item) => item.status === "in-review").length,
      unassigned: cases.filter((item) => !item.analyst_owner).length,
      malaysiaTargeted: cases.filter((item) => item.malaysia_targeted).length,
    };
  }, [data]);

  const priorityCases = useMemo(() => {
    return [...filtered]
      .sort((left, right) => {
        const riskRank = { High: 3, Medium: 2, Low: 1 };
        const leftRank = riskRank[left.risk_level as keyof typeof riskRank] ?? 0;
        const rightRank = riskRank[right.risk_level as keyof typeof riskRank] ?? 0;
        if (leftRank !== rightRank) {
          return rightRank - leftRank;
        }
        if (left.malaysia_targeted !== right.malaysia_targeted) {
          return Number(right.malaysia_targeted) - Number(left.malaysia_targeted);
        }
        return new Date(right.submitted_at).getTime() - new Date(left.submitted_at).getTime();
      })
      .slice(0, 3);
  }, [filtered]);

  if (!data) {
    return <LoadingPanel label="Loading agency queue..." />;
  }

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Agency Queue"
        title={data.name}
        description={data.description}
        action={<Badge>SLA {data.default_sla_hours} hours</Badge>}
      />

      {metrics ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <QueueMetric label="Assigned cases" value={String(metrics.total)} icon={ShieldCheck} />
          <QueueMetric label="High-risk cases" value={String(metrics.highRisk)} icon={AlertTriangle} />
          <QueueMetric label="In review" value={String(metrics.inReview)} icon={Clock3} />
          <QueueMetric label="Unassigned" value={String(metrics.unassigned)} icon={UserRoundX} />
          <QueueMetric label="Target-market flagged" value={String(metrics.malaysiaTargeted)} icon={ShieldCheck} />
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="p-5">
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3">
              <Search className="h-4 w-4 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by case reference, URL, or summary"
                className="border-0 p-0 shadow-none focus:border-0"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <FilterGroup
                label="Risk level"
                options={["All", "High", "Medium", "Low"]}
                value={riskFilter}
                onChange={(value) => setRiskFilter(value as typeof riskFilter)}
              />
              <FilterGroup
                label="Status"
                options={["All", "new", "pending-review", "in-review", "escalation-placeholder", "closed"]}
                value={statusFilter}
                onChange={(value) => setStatusFilter(value as typeof statusFilter)}
              />
              <FilterGroup
                label="Target market"
                options={["All", "Targeted", "Not Targeted"]}
                value={targetedFilter}
                onChange={(value) => setTargetedFilter(value as typeof targetedFilter)}
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Queue posture</p>
          <div className="mt-4 space-y-4 text-sm leading-6 text-slate-600">
            <div className="rounded-3xl border border-line bg-canvas/70 p-4">
              This queue view is designed for analyst triage. It emphasizes risk posture, target-market relevance, owner assignment, and recent activity.
            </div>
            <div className="rounded-3xl border border-line bg-canvas/70 p-4">
              Priority order is derived from risk level first, then target-market status, then submission recency. Findings remain decision-support only.
            </div>
            <div className="rounded-3xl border border-line bg-canvas/70 p-4">
              Current filtered result set: <span className="font-semibold text-ink">{filtered.length}</span> cases.
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        {priorityCases.map((item, index) => (
          <Card key={item.id} className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Badge className="bg-accentSoft text-accent border-accentSoft">Priority {index + 1}</Badge>
                <p className="mt-3 font-display text-xl font-bold text-ink">{item.case_reference}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.summary}</p>
              </div>
              <StatusPill value={item.risk_level} />
            </div>
            <div className="mt-5 grid gap-3">
              <div className="rounded-2xl border border-line bg-canvas/70 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Category</p>
                <p className="mt-2 font-semibold text-ink">{item.category}</p>
              </div>
              <div className="rounded-2xl border border-line bg-canvas/70 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Target market</p>
                <p className="mt-2 font-semibold text-ink">
                  {item.malaysia_targeted ? "Targeted" : "Not targeted"} ({item.malaysia_targeting_score}/100)
                </p>
              </div>
              <div className="rounded-2xl border border-line bg-canvas/70 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Analyst owner</p>
                <p className="mt-2 font-semibold text-ink">{item.analyst_owner ?? "Unassigned"}</p>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between gap-3">
              <StatusPill value={item.status} />
              <Link
                to={`/cases/${item.id}`}
                className="inline-flex items-center justify-center rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink/90"
              >
                Open case
              </Link>
            </div>
          </Card>
        ))}
      </section>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-line px-6 py-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Assigned cases</p>
          <h2 className="mt-1 font-display text-2xl font-bold text-ink">{filtered.length} cases in scope</h2>
        </div>
        {filtered.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-medium">Case</th>
                  <th className="px-6 py-4 font-medium">Risk</th>
                  <th className="px-6 py-4 font-medium">Target market</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Owner</th>
                  <th className="px-6 py-4 font-medium">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-t border-line/70">
                    <td className="px-6 py-4">
                      <Link to={`/cases/${item.id}`} className="font-semibold text-ink hover:text-accent">
                        {item.case_reference}
                      </Link>
                      <p className="mt-1 max-w-lg text-xs leading-5 text-slate-500">{item.summary}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <StatusPill value={item.risk_level} />
                        <p className="text-slate-600">{item.category}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <Badge className={item.malaysia_targeted ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-700 border-slate-200"}>
                          {item.malaysia_targeted ? "Targeted" : "Not targeted"}
                        </Badge>
                        <p className="text-slate-600">{item.malaysia_targeting_score}/100</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusPill value={item.status} />
                    </td>
                    <td className="px-6 py-4 text-slate-600">{item.analyst_owner ?? "Unassigned"}</td>
                    <td className="px-6 py-4 text-slate-600">{formatDate(item.submitted_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-10">
            <div className="rounded-3xl border border-dashed border-line bg-canvas/70 p-8 text-center">
              <p className="font-display text-2xl font-bold text-ink">No cases match the current filters</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Adjust search terms, risk level, status, or target-market filters to restore the queue view.
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function QueueMetric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof ShieldCheck;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
          <p className="mt-3 font-display text-3xl font-extrabold text-ink">{value}</p>
        </div>
        <div className="rounded-2xl bg-accentSoft p-3 text-accent">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function FilterGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
