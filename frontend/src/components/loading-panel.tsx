import { Card } from "./ui/card";

export function LoadingPanel({ label = "Loading operational data..." }: { label?: string }) {
  return (
    <Card className="p-8">
      <div className="space-y-4">
        <div className="h-3 w-40 animate-pulse rounded-full bg-slate-200" />
        <div className="h-10 w-full animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-10 w-4/5 animate-pulse rounded-2xl bg-slate-100" />
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </Card>
  );
}

