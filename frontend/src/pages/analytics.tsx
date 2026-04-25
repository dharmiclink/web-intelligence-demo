import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { LoadingPanel } from "../components/loading-panel";
import { SectionHeader } from "../components/section-header";
import { Card } from "../components/ui/card";
import { api } from "../lib/api";
import type { AnalyticsData } from "../lib/types";

export function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    api.getAnalytics().then(setData);
  }, []);

  if (!data) {
    return <LoadingPanel label="Loading analytics..." />;
  }

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Analytics"
        title="Operational Trends And Review Insights"
        description="Analytics views are designed for executive steering committees and technical evaluators. They show scan volume, suspicious rates, category shifts, routing patterns, and placeholder reviewer outcomes."
      />

      <section className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="Scan Volume Over Time">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.scan_volume}>
              <CartesianGrid stroke="#e5edf4" vertical={false} />
              <XAxis dataKey="label" stroke="#718096" />
              <YAxis stroke="#718096" />
              <Tooltip />
              <Area type="monotone" dataKey="scanned" stroke="#124c76" fill="#d8e8f3" />
              <Area type="monotone" dataKey="targeted" stroke="#1f6a62" fill="#d8efe8" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Suspicious Rate Over Time">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.suspicious_rate}>
              <CartesianGrid stroke="#e5edf4" vertical={false} />
              <XAxis dataKey="label" stroke="#718096" />
              <YAxis stroke="#718096" />
              <Tooltip />
              <Line type="monotone" dataKey="rate" stroke="#9a6b18" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="Category Trends">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.category_trends}>
              <CartesianGrid stroke="#e5edf4" vertical={false} />
              <XAxis dataKey="label" stroke="#718096" />
              <YAxis stroke="#718096" />
              <Tooltip />
              <Legend />
              <Bar dataKey="pharmacy" stackId="a" fill="#a13f36" radius={[8, 8, 0, 0]} />
              <Bar dataKey="gambling" stackId="a" fill="#9a6b18" radius={[8, 8, 0, 0]} />
              <Bar dataKey="adult" stackId="a" fill="#7c4d8d" radius={[8, 8, 0, 0]} />
              <Bar dataKey="commerce" stackId="a" fill="#1f6a62" radius={[8, 8, 0, 0]} />
              <Bar dataKey="unknown" stackId="a" fill="#7f8da0" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Routing Trends">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.routing_trends}>
              <CartesianGrid stroke="#e5edf4" vertical={false} />
              <XAxis dataKey="label" stroke="#718096" />
              <YAxis stroke="#718096" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="health" stroke="#a13f36" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="customs" stroke="#1f6a62" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="police" stroke="#9a6b18" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="mcmc" stroke="#124c76" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <SimpleBarCard title="Reviewer outcomes" data={data.reviewer_outcomes} tone="#124c76" />
        <SimpleBarCard title="Outcome placeholders" data={data.outcome_placeholders} tone="#1f6a62" />
        <SimpleBarCard title="Target-market patterns" data={data.targeting_patterns} tone="#9a6b18" />
      </section>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-6">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <div className="mt-5 h-[320px]">{children}</div>
    </Card>
  );
}

function SimpleBarCard({
  title,
  data,
  tone,
}: {
  title: string;
  data: Array<{ label: string; value: number }>;
  tone: string;
}) {
  return (
    <Card className="p-6">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <div className="mt-5 h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
            <CartesianGrid stroke="#e5edf4" horizontal={false} />
            <XAxis type="number" stroke="#718096" />
            <YAxis dataKey="label" type="category" stroke="#718096" width={120} />
            <Tooltip />
            <Bar dataKey="value" fill={tone} radius={[0, 10, 10, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
