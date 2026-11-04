import { Heart, PencilLine, RotateCcw, ShoppingBag } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { CountUp } from "../components/CountUp";
import { Button } from "../components/Glass";
import { OutfitBoard } from "../components/OutfitBoard";
import { Sheet } from "../components/Sheet";
import { Sk } from "../components/Skeleton";
import { ItemStrip, Section } from "../components/Strip";
import { TagEditor } from "../components/TagEditor";
import { toast } from "../components/Toast";
import { analyzeImage, uploadItem, useAddWant, useMe } from "../lib/api";
import { useWardrobe } from "../lib/hooks";
import type { Prepared } from "../lib/image";
import { checkCandidate, SIMILAR_SAME, type Verdict } from "../shared/engine";
import { type Item, type ItemTags, subLabel } from "../shared/types";

export type Candidate = Prepared & { tags: ItemTags | null };

const VERDICT: Record<Verdict, { label: string; color: string }> = {
  buy: { label: "買い", color: "var(--color-buy)" },
  hold: { label: "保留", color: "var(--color-hold)" },
  skip: { label: "見送り", color: "var(--color-skip)" },
};

const FALLBACK_TAGS = (color: string): ItemTags => ({
  category: "top",
  subcategory: "tshirt",
  color,
  pattern: "solid",
  fit: "regular",
  formality: 2,
  warmth: 2,
  seasons: ["spring", "summer", "autumn", "winter"],
});

export function CheckResult({
  candidate,
  onClose,
  onDone,
}: {
  candidate: Candidate;
  onClose: () => void;
  onDone: () => void;
}) {
  const { usable, orphans } = useWardrobe();
  const me = useMe();
  const addWant = useAddWant();
  const [tags, setTags] = useState<ItemTags | null>(candidate.tags);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: 判定は初回と「再試行」のときだけ走らせる
  useEffect(() => {
    if (tags) return;
    let alive = true;
    setFailed(false);
    analyzeImage(candidate.blob, candidate.color)
      .then((t) => alive && setTags(t))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [attempt]);

  const result = useMemo(() => (tags ? checkCandidate(tags, usable) : null), [tags, usable]);
  const candItem = useMemo<Item | null>(
    () =>
      tags
        ? ({
            ...tags,
            id: "__candidate__",
            status: "ready",
            imageKey: "",
            cutoutKey: null,
            wearCount: 0,
            lastWornAt: null,
            createdAt: "",
            brand: null,
            price: null,
            localUrl: candidate.previewUrl,
          } as Item)
        : null,
    [tags, candidate.previewUrl],
  );

  const bought = async () => {
    if (!tags) return;
    setSaving(true);
    try {
      await uploadItem(candidate.blob, candidate.color, tags);
      toast("クローゼットに追加");
      onDone();
    } catch {
      toast("追加できません");
      setSaving(false);
    }
  };

  const want = async () => {
    if (!tags) return;
    try {
      await addWant.mutateAsync({ kind: "check", image: candidate.blob, tags });
      toast("気になるリストに追加");
      onDone();
    } catch {
      toast("追加できません");
    }
  };

  const v = result ? VERDICT[result.verdict] : null;

  return (
    <Sheet onClose={onClose} zIndex={60} label="買う前チェックの結果">
      <div className="text-ink" data-testid="check-result">
        {/* 候補 */}
        <div className="flex items-center gap-4 px-5 pb-2">
          <motion.img
            layoutId="cand-photo"
            src={candidate.previewUrl}
            alt=""
            className="h-24 w-20 shrink-0 rounded-[18px] object-cover shadow-[0_6px_18px_rgb(20_24_40/0.15)]"
          />
          <div className="min-w-0 flex-1">
            {result && v ? (
              <motion.div
                initial={{ scale: 1.25, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 18 }}
                className="inline-flex rounded-full px-5 py-2 text-[22px] font-bold text-white"
                style={{ background: v.color }}
                data-testid="verdict"
              >
                {v.label}
              </motion.div>
            ) : failed ? (
              <div className="text-[15px] font-semibold">判定できません</div>
            ) : (
              <Sk className="h-11 w-28 rounded-full" />
            )}
            <div className="mt-2 text-[12px] text-ink-2">
              {result ? (
                <span className="num">
                  似ている手持ち {result.similar.filter((s) => s.score >= 0.7).length}着 · 合う手持ち{" "}
                  {result.matches.length}着
                </span>
              ) : failed ? null : (
                <Sk className="h-3.5 w-40" />
              )}
            </div>
            {tags && (
              <button
                type="button"
                onClick={() => setEditing((e) => !e)}
                className="mt-2 inline-flex items-center gap-1 text-[12px] text-ink-2"
              >
                <PencilLine size={13} />
                {subLabel(tags.category, tags.subcategory)}
              </button>
            )}
          </div>
        </div>

        {failed && !tags && (
          <div className="flex gap-2 px-5 py-2">
            <Button className="h-10 px-4 text-[13px]" onClick={() => setAttempt((a) => a + 1)}>
              <RotateCcw size={15} /> 再試行
            </Button>
            <Button
              className="h-10 px-4 text-[13px]"
              onClick={() => {
                setTags(FALLBACK_TAGS(candidate.color));
                setEditing(true);
              }}
            >
              <PencilLine size={15} /> 手で選ぶ
            </Button>
          </div>
        )}

        {editing && tags && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden"
          >
            <TagEditor tags={tags} onChange={setTags} gender={me.data?.gender ?? null} />
          </motion.div>
        )}

        {/* 増える組み合わせ */}
        <Section title="増える組み合わせ">
          <div className="px-5">
            {result ? (
              <div className="flex items-baseline gap-1" data-testid="gain">
                <CountUp value={result.gain} prefix="＋" className="text-[44px] font-bold leading-none" />
                <span className="text-[15px] font-bold">通り</span>
                <span className="num ml-2 text-[12px] text-ink-2">手持ち {result.totalOutfits}通り</span>
              </div>
            ) : (
              <Sk className="h-11 w-36" />
            )}
          </div>
          <div className="no-scrollbar mt-3 flex gap-2.5 overflow-x-auto px-5">
            {result && candItem
              ? result.examples.map((ex, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + i * 0.07, type: "spring", stiffness: 340, damping: 28 }}
                    className="glass aspect-[4/5] w-[42%] shrink-0 rounded-[22px] p-1.5"
                  >
                    <OutfitBoard
                      pieces={ex.map((x) => (x.id === "__candidate__" ? candItem : (x as Item)))}
                      compact
                    />
                  </motion.div>
                ))
              : [0, 1, 2].map((i) => <Sk key={i} className="aspect-[4/5] w-[42%] shrink-0 rounded-[22px]" />)}
          </div>
        </Section>

        {/* 似ている手持ち */}
        <Section title="似ている手持ち">
          {result ? (
            result.similar.length ? (
              <ItemStrip
                items={result.similar.map((s) => s.item)}
                badge={(it) => {
                  const s = result.similar.find((x) => x.item.id === it.id)?.score ?? 0;
                  return (
                    <span className={s >= SIMILAR_SAME ? "font-bold text-skip" : ""}>
                      {Math.round(s * 100)}%{s >= SIMILAR_SAME ? " ほぼ同じ" : ""}
                    </span>
                  );
                }}
                linkable={false}
              />
            ) : (
              <div className="px-5 text-[13px] text-ink-2 num">0着</div>
            )
          ) : (
            <StripSkeleton />
          )}
        </Section>

        {/* 合う手持ち */}
        <Section title="合う手持ち">
          {result ? (
            result.matches.length ? (
              <ItemStrip items={result.matches.slice(0, 20)} marks={orphans} linkable={false} />
            ) : (
              <div className="px-5 text-[13px] text-ink-2 num">0着</div>
            )
          ) : (
            <StripSkeleton />
          )}
        </Section>

        {/* 操作 */}
        <div className="sticky bottom-0 flex gap-2.5 px-5 pt-3">
          <Button
            className="h-13 flex-1 py-3.5 text-[15px]"
            onClick={want}
            disabled={!tags || addWant.isPending}
          >
            <Heart size={18} /> 気になる
          </Button>
          <Button
            variant="ink"
            className="h-13 flex-1 py-3.5 text-[15px]"
            onClick={bought}
            disabled={!tags || saving}
            data-testid="bought"
          >
            <ShoppingBag size={18} /> 買った
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

function StripSkeleton() {
  return (
    <div className="flex gap-2 px-5">
      {[0, 1, 2, 3].map((i) => (
        <Sk key={i} className="aspect-[3/4] w-[84px] shrink-0 rounded-[18px]" />
      ))}
    </div>
  );
}
