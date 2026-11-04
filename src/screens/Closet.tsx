import { ArrowDownWideNarrow, Camera, Inbox } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { Button, Chip, Glass } from "../components/Glass";
import { ItemImage } from "../components/ItemImage";
import { ClosetSkeleton } from "../components/Skeleton";
import { ScreenHeader } from "../components/Strip";
import { useDelayed, useWardrobe } from "../lib/hooks";
import { useNav } from "../lib/nav";
import { colorSortKey } from "../shared/color";
import { CATEGORIES, CATEGORY_LABEL, type Category } from "../shared/types";

type Filter = "all" | Category | "unworn";
type Sort = "new" | "color" | "worn";
const SORT_LABEL: Record<Sort, string> = { new: "新しい順", color: "色順", worn: "着た回数" };

export const hiddenItems = new Set<string>();

export function ClosetScreen() {
  const nav = useNav();
  const { items, isLoading } = useWardrobe();
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("new");
  const showSk = useDelayed(isLoading);

  const review = items.filter((i) => i.status === "review").length;
  const list = useMemo(() => {
    let l = items.filter((i) => !hiddenItems.has(i.id));
    if (filter === "unworn") l = l.filter((i) => i.status !== "processing" && !i.wearCount);
    else if (filter !== "all") l = l.filter((i) => i.category === filter);
    const sorted = [...l];
    if (sort === "color") sorted.sort((a, b) => colorSortKey(a.color) - colorSortKey(b.color));
    else if (sort === "worn") sorted.sort((a, b) => b.wearCount - a.wearCount);
    return sorted;
  }, [items, filter, sort]);

  if (isLoading) return showSk ? <ClosetSkeleton /> : null;

  const counts = (c: Filter) =>
    c === "all"
      ? items.length
      : c === "unworn"
        ? items.filter((i) => i.status !== "processing" && !i.wearCount).length
        : items.filter((i) => i.category === c).length;

  return (
    <div>
      <ScreenHeader
        title={
          <span>
            クローゼット <span className="num ml-1 text-[18px] text-ink-2">{items.length}</span>
          </span>
        }
        right={
          <Button
            className="h-9 px-3.5 text-[13px]"
            onClick={() => setSort((s) => (s === "new" ? "color" : s === "color" ? "worn" : "new"))}
            data-testid="sort"
          >
            <ArrowDownWideNarrow size={15} />
            <AnimatePresence mode="wait">
              <motion.span
                key={sort}
                initial={{ y: 6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -6, opacity: 0 }}
              >
                {SORT_LABEL[sort]}
              </motion.span>
            </AnimatePresence>
          </Button>
        }
      />

      <AnimatePresence>
        {review > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden px-4"
          >
            <Glass
              strong
              className="mb-3 flex items-center justify-between rounded-full py-2 pl-4 pr-2"
              whileTap={{ scale: 0.98 }}
              onClick={() => nav.open({ type: "review" })}
              role="button"
              data-testid="review-banner"
            >
              <span className="flex items-center gap-2 text-[14px] font-medium">
                <Inbox size={17} /> 確認待ち <span className="num font-bold">{review}</span>
              </span>
              <span className="rounded-full bg-ink px-3.5 py-1.5 text-[12px] font-semibold text-white">
                確認
              </span>
            </Glass>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="no-scrollbar mb-3 flex gap-1.5 overflow-x-auto px-4">
        {(["all", ...CATEGORIES, "unworn"] as Filter[]).map((f) => {
          const n = counts(f);
          if (f !== "all" && f !== "unworn" && !n) return null;
          return (
            <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
              {f === "all" ? "すべて" : f === "unworn" ? "出番なし" : CATEGORY_LABEL[f]}
              <span className="num ml-1 opacity-60">{n}</span>
            </Chip>
          );
        })}
      </div>

      {list.length === 0 ? (
        <div className="flex flex-col items-center pt-[14vh]">
          <div className="glass mb-6 flex h-24 w-24 items-center justify-center rounded-[32px]">
            <Camera size={36} strokeWidth={1.6} />
          </div>
          <Button
            variant="ink"
            className="h-12 px-7 text-[15px]"
            onClick={() => nav.open({ type: "camera", mode: "register", onboarding: items.length < 10 })}
          >
            撮る
          </Button>
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-3 gap-2.5 px-4" data-testid="closet-grid">
          <AnimatePresence initial={false}>
            {list.map((it, idx) => (
              <motion.button
                layout
                key={it.id}
                type="button"
                onClick={() => it.status !== "processing" && nav.open({ type: "item", id: it.id })}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ type: "spring", stiffness: 380, damping: 30, delay: Math.min(idx, 12) * 0.015 }}
                whileTap={{ scale: 0.95 }}
                className="relative"
              >
                <ItemImage
                  item={it}
                  layoutId={`item-${it.id}`}
                  className="glass aspect-[3/4] w-full rounded-[20px]"
                />
                {it.status === "review" && (
                  <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-white" />
                )}
              </motion.button>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
