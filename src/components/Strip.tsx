import { motion } from "motion/react";
import type { ReactNode } from "react";
import { useNav } from "../lib/nav";
import type { Item } from "../shared/types";
import { ItemImage } from "./ItemImage";

export function Section({
  title,
  right,
  children,
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="py-3">
      <div className="mb-2 flex items-baseline justify-between px-5">
        <h2 className="text-[15px] font-bold">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

/** 手持ちの横スクロール。押すと詳細へ */
export function ItemStrip({
  items,
  badge,
  marks,
  size = 84,
  linkable = true,
}: {
  items: Item[];
  badge?: (i: Item) => ReactNode;
  marks?: Set<string>;
  size?: number;
  linkable?: boolean;
}) {
  const nav = useNav();
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto px-5 pb-1">
      {items.map((it, idx) => (
        <motion.button
          key={it.id}
          type="button"
          disabled={!linkable}
          onClick={() => nav.open({ type: "item", id: it.id })}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: Math.min(idx, 8) * 0.04, type: "spring", stiffness: 380, damping: 30 }}
          whileTap={{ scale: 0.94 }}
          className="relative shrink-0"
          style={{ width: size }}
        >
          <ItemImage item={it} className="glass aspect-[3/4] w-full rounded-[18px]" />
          {marks?.has(it.id) && (
            <span className="absolute left-1 top-1 rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-semibold text-white">
              出番なし
            </span>
          )}
          {badge && <div className="mt-1 text-center text-[11px] text-ink-2 num">{badge(it)}</div>}
        </motion.button>
      ))}
    </div>
  );
}

export function ScreenHeader({ title, right }: { title: ReactNode; right?: ReactNode }) {
  return (
    <header
      className="flex items-center justify-between px-5 pb-3"
      style={{ paddingTop: "calc(var(--safe-top) + 22px)" }}
    >
      <h1 className="text-[26px] font-bold tracking-tight">{title}</h1>
      {right}
    </header>
  );
}
