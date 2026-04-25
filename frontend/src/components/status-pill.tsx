import { Badge } from "./ui/badge";

const toneMap: Record<string, string> = {
  High: "bg-red-50 text-red-700 border-red-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  Low: "bg-emerald-50 text-emerald-700 border-emerald-200",
  new: "bg-slate-100 text-slate-700 border-slate-200",
  "pending-review": "bg-amber-50 text-amber-700 border-amber-200",
  "in-review": "bg-blue-50 text-blue-700 border-blue-200",
  "escalation-placeholder": "bg-violet-50 text-violet-700 border-violet-200",
  closed: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export function StatusPill({ value }: { value: string }) {
  return <Badge className={toneMap[value] ?? "bg-slate-100 text-slate-700 border-slate-200"}>{value}</Badge>;
}

