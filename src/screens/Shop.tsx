import { Check, Plus, ScanLine, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";
import { CountUp } from "../components/CountUp";
import { Button, Glass } from "../components/Glass";
import { ItemImage } from "../components/ItemImage";
import { Silhouette } from "../components/Silhouette";
import { ShopSkeleton } from "../components/Skeleton";
import { ScreenHeader, Section } from "../components/Strip";
import { toast } from "../components/Toast";
import { imageUrl, useAddWant, useMe, useRemoveWant, useWants } from "../lib/api";
import { useDelayed, useWardrobe } from "../lib/hooks";
import { useNav } from "../lib/nav";
import { recommend } from "../shared/archetypes";
import { checkCandidate, type Verdict } from "../shared/engine";
import type { Item, Want } from "../shared/types";
import { subLabel } from "../shared/types";

const VERDICT: Record<Verdict, [string, string]> = {
  buy: ["買い", "bg-buy"],
  hold: ["保留", "bg-hold"],
  skip: ["見送り", "bg-skip"],
};

function Thumbs({ items, marks }: { items: Item[]; marks?: Set<string> }) {
  return (
    <div className="flex -space-x-2.5">
      {items.slice(0, 5).map((it) => (
        <div key={it.id} className="relative">
          <ItemImage item={it} className="h-10 w-10 rounded-full border-2 border-white" />
          {marks?.has(it.id) && (
            <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-accent ring-2 ring-white" />
          )}
        </div>
      ))}
      {items.length > 5 && (
        <div className="num flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-white/80 text-[11px] font-semibold">
          +{items.length - 5}
        </div>
      )}
    </div>
  );
}

export function ShopScreen() {
  const nav = useNav();
  const me = useMe();
  const { usable, orphans, isLoading } = useWardrobe();
  const wants = useWants();
  const addWant = useAddWant();
  const removeWant = useRemoveWant();
  const showSk = useDelayed(isLoading || wants.isLoading);

  const recs = useMemo(
    () => recommend(usable, { gender: me.data?.gender ?? null, today: new Date(), limit: 5 }),
    [usable, me.data?.gender],
  );
  const list = (wants.data ?? []).filter((w) => w.kind === "archetype");
  const watching = (wants.data ?? []).filter((w) => w.kind === "check");
  const inList = (id: string) =>
    list.find((w) => w.label && w.tags && `${w.tags.category}:${w.tags.subcategory}:${w.tags.color}` === id);

  if (isLoading || wants.isLoading) return showSk ? <ShopSkeleton /> : null;

  return (
    <div>
      <ScreenHeader title="買い物" />

      <div className="px-5">
        <Glass
          refract
          role="button"
          whileTap={{ scale: 0.98 }}
          onClick={() => nav.open({ type: "camera", mode: "check" })}
          className="flex items-center gap-4 rounded-[28px] p-4"
          data-testid="check-button"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-ink text-white">
            <ScanLine size={26} />
          </div>
          <div className="text-[17px] font-bold">買う前チェック</div>
        </Glass>
      </div>

      <Section title="買うと良い服">
        <div className="space-y-2.5 px-5" data-testid="recs">
          {recs.map((r, i) => {
            const key = `${r.archetype.category}:${r.archetype.subcategory}:${r.archetype.color}`;
            const saved = inList(key);
            return (
              <Glass
                key={r.archetype.id}
                className="flex gap-3.5 rounded-[26px] p-3.5"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, type: "spring", stiffness: 320, damping: 28 }}
              >
                <div className="flex h-[92px] w-[80px] shrink-0 items-center justify-center rounded-[20px] bg-white/70">
                  <Silhouette
                    category={r.archetype.category}
                    subcategory={r.archetype.subcategory}
                    color={r.archetype.color}
                    className="h-[70px] w-[70px]"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-[14px] font-semibold leading-snug">{r.archetype.label}</div>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.85 }}
                      aria-label={saved ? "リストから外す" : "買い物リストへ"}
                      onClick={() =>
                        saved
                          ? removeWant.mutate(saved.id)
                          : addWant.mutate(
                              { kind: "archetype", tags: r.archetype, label: r.archetype.label },
                              { onSuccess: () => toast("買い物リストに追加") },
                            )
                      }
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${saved ? "bg-ink text-white" : "glass"}`}
                    >
                      {saved ? <Check size={16} /> : <Plus size={16} />}
                    </motion.button>
                  </div>
                  <div className="mt-0.5 flex items-baseline gap-0.5">
                    <CountUp value={r.gain} prefix="＋" className="text-[24px] font-bold" />
                    <span className="text-[12px] font-bold">通り</span>
                  </div>
                  {r.matches.length > 0 && (
                    <div className="mt-1 flex items-center gap-2">
                      <Thumbs items={r.matches} marks={orphans} />
                      {r.rescued.length > 0 && (
                        <span className="num rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
                          出番なし {r.rescued.length}着が活きる
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </Glass>
            );
          })}
        </div>
      </Section>

      <AnimatePresence>
        {list.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Section
              title="買い物リスト"
              right={<span className="num text-[12px] text-ink-2">{list.length}</span>}
            >
              <div className="space-y-2 px-5">
                <AnimatePresence initial={false}>
                  {list.map((w) => (
                    <WantRow key={w.id} want={w} onRemove={() => removeWant.mutate(w.id)} />
                  ))}
                </AnimatePresence>
              </div>
            </Section>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {watching.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Section
              title="気になる"
              right={<span className="num text-[12px] text-ink-2">{watching.length}</span>}
            >
              <div className="space-y-2 px-5">
                <AnimatePresence initial={false}>
                  {watching.map((w) => (
                    <WantRow key={w.id} want={w} usable={usable} onRemove={() => removeWant.mutate(w.id)} />
                  ))}
                </AnimatePresence>
              </div>
            </Section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function WantRow({ want, usable, onRemove }: { want: Want; usable?: Item[]; onRemove: () => void }) {
  // 気になる物は、今の手持ちで判定し直す
  const res = useMemo(() => (usable ? checkCandidate(want.tags, usable) : null), [want.tags, usable]);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 380, damping: 34 }}
    >
      <Glass className="flex items-center gap-3 rounded-[22px] p-2.5 pr-3">
        {want.imageKey ? (
          <img src={imageUrl(want.imageKey)} alt="" className="h-14 w-12 rounded-[14px] object-cover" />
        ) : (
          <div className="flex h-14 w-12 items-center justify-center rounded-[14px] bg-white/70">
            <Silhouette
              category={want.tags.category}
              subcategory={want.tags.subcategory}
              color={want.tags.color}
              className="h-10 w-10"
            />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-medium">
            {want.label ?? subLabel(want.tags.category, want.tags.subcategory)}
          </div>
          {res && (
            <div className="mt-1 flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold text-white ${VERDICT[res.verdict][1]}`}
              >
                {VERDICT[res.verdict][0]}
              </span>
              <span className="num text-[12px] text-ink-2">＋{res.gain}通り</span>
            </div>
          )}
        </div>
        <Button variant="plain" className="h-9 w-9" onClick={onRemove} aria-label="外す">
          <X size={17} />
        </Button>
      </Glass>
    </motion.div>
  );
}
