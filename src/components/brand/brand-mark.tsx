import { cn } from "@/lib/cn";

type BrandMarkProps = {
  className?: string;
};

export function BrandMark({ className }: BrandMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("relative inline-flex size-9 items-center justify-center", className)}
    >
      <span className="absolute left-0 top-1 size-6 rounded-full border-[3px] border-brand" />
      <span className="absolute right-0 top-1 size-6 rounded-full border-[3px] border-action" />
      <span className="absolute bottom-0 left-1/2 size-3 -translate-x-1/2 rounded-full bg-brand" />
    </span>
  );
}
