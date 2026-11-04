import type { CSSProperties } from "react";

export function Sk({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return <div className={`sk rounded-2xl ${className}`} style={style} aria-hidden="true" />;
}

export function HeaderSkeleton() {
  return (
    <div
      className="flex items-center justify-between px-5 pb-3"
      style={{ paddingTop: "calc(var(--safe-top) + 22px)" }}
    >
      <Sk className="h-7 w-36" />
      <Sk className="h-9 w-24 rounded-full" />
    </div>
  );
}

export function TodaySkeleton() {
  return (
    <div aria-busy="true">
      <HeaderSkeleton />
      <div className="px-5">
        <Sk className="aspect-[4/5] w-full rounded-[28px]" />
        <div className="mt-4 flex justify-center gap-2">
          <Sk className="h-2 w-6 rounded-full" />
          <Sk className="h-2 w-2 rounded-full" />
          <Sk className="h-2 w-2 rounded-full" />
        </div>
        <Sk className="mx-auto mt-5 h-12 w-44 rounded-full" />
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-2.5 px-4" aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        <Sk key={i} className="aspect-[3/4] rounded-[20px]" style={{ animationDelay: `${i * 40}ms` }} />
      ))}
    </div>
  );
}

export function ClosetSkeleton() {
  return (
    <div aria-busy="true">
      <HeaderSkeleton />
      <div className="mb-4 flex gap-2 overflow-hidden px-4">
        {[56, 72, 72, 64, 80, 64].map((w, i) => (
          <Sk key={i} className="h-8 shrink-0 rounded-full" style={{ width: w }} />
        ))}
      </div>
      <GridSkeleton />
    </div>
  );
}

export function ShopSkeleton() {
  return (
    <div aria-busy="true">
      <HeaderSkeleton />
      <div className="space-y-3 px-5">
        <Sk className="h-20 w-full rounded-[28px]" />
        <Sk className="mt-6 h-5 w-32" />
        {[0, 1, 2].map((i) => (
          <Sk key={i} className="h-36 w-full rounded-[28px]" />
        ))}
      </div>
    </div>
  );
}

export function MeSkeleton() {
  return (
    <div aria-busy="true">
      <HeaderSkeleton />
      <div className="space-y-3 px-5">
        <Sk className="h-20 w-full rounded-[28px]" />
        <Sk className="h-28 w-full rounded-[28px]" />
        <Sk className="h-40 w-full rounded-[28px]" />
      </div>
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="space-y-3 px-5" aria-busy="true">
      <div className="grid grid-cols-3 gap-2">
        <Sk className="h-20 rounded-[22px]" />
        <Sk className="h-20 rounded-[22px]" />
        <Sk className="h-20 rounded-[22px]" />
      </div>
      <Sk className="h-5 w-28" />
      <div className="flex gap-2">
        <Sk className="h-24 w-20 rounded-[18px]" />
        <Sk className="h-24 w-20 rounded-[18px]" />
        <Sk className="h-24 w-20 rounded-[18px]" />
      </div>
    </div>
  );
}
