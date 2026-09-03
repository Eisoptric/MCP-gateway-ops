import { cn } from "@/lib/utils";

const tones = {
  operational: "bg-success",
  active: "bg-success",
  pending: "bg-warning",
  degraded: "bg-warning",
  paused: "bg-[#c4c4be]",
  down: "bg-destructive",
  disconnected: "bg-destructive",
  error: "bg-destructive",
} as const;

export type StatusTone = keyof typeof tones;

export function StatusDot({
  tone,
  className,
}: {
  tone: StatusTone;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-block size-1.5 shrink-0 rounded-full", tones[tone], className)}
    />
  );
}

export function StatusLabel({
  tone,
  children,
  className,
}: {
  tone: StatusTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[12px] text-muted-foreground",
        className
      )}
    >
      <StatusDot tone={tone} />
      {children}
    </span>
  );
}
