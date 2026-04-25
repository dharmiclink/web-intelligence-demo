import type { ReactNode } from "react";

import { Badge } from "./ui/badge";

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="space-y-3">
        {eyebrow ? <Badge className="bg-white">{eyebrow}</Badge> : null}
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink md:text-4xl">{title}</h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-600 md:text-base">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

