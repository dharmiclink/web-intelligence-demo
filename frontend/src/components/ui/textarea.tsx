import type { TextareaHTMLAttributes } from "react";

import { cn } from "../../lib/utils";

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "min-h-[128px] w-full rounded-3xl border border-line bg-white px-4 py-3 text-sm text-ink shadow-sm outline-none placeholder:text-slate-400 focus:border-accent/40",
        props.className,
      )}
    />
  );
}

