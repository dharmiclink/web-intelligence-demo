import type { InputHTMLAttributes } from "react";

import { cn } from "../../lib/utils";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink shadow-sm outline-none ring-0 placeholder:text-slate-400 focus:border-accent/40",
        props.className,
      )}
    />
  );
}

