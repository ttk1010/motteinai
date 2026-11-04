import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, PencilLine, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { CountUp } from "../components/CountUp";
import { Button, Glass } from "../components/Glass";
import { ItemImage } from "../components/ItemImage";
import { ItemStrip, Section } from "../components/Strip";
import { TagEditor, tagsOf } from "../components/TagEditor";
import { toast } from "../components/Toast";
import { deleteItem, useMe, useUpdateItem } from "../lib/api";
import { useWardrobe } from "../lib/hooks";
import { useNav } from "../lib/nav";
import { colorName } from "../shared/color";
import { matchesFor, mostSimilar, outfitCountWith, SIMILAR_WARN } from "../shared/engine";
import { type Item, type ItemTags, subLabel } from "../shared/types";
import { hiddenItems } from "./Closet";

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Glass className="flex flex-col items-start rounded-[22px] px-3.5 py-3">
      <span className="text-[11px] text-ink-2">{label}</span>
      <span className="num mt-0.5 text-[20px] font-bold leading-tight">{children}</span>
    </Glass>
  );
}

export function ItemDetail({ id }: { id: string }) {
  const nav = useNav();
  const qc = useQueryClient();
  const { items, usable, orphans } = useWardrobe();
  const me = useMe();
  const update = useUpdateItem();
  const item = items.find((i) => i.id === id);
  const [editing, setEditing] = useState(false);

  const info = useMemo(() => {
    if (!item) return null;
    const others = usable.filter((i) => i.id !== item.id);
    return {
      count: outfitCountWith(item, usable),
      similar: mostSimilar(item, others, 6).filter((s) => s.score >= SIMILAR_WARN),
      matches: matchesFor(item, others).slice(0, 20),
    };
  }, [item, usable]);

  if (!item || !info) return null;

  const onTags = (t: ItemTags) => update.mutate({ id: item.id, ...t });

  const remove = () => {
    hiddenItems.add(item.id);
    qc.setQueryData<Item[]>(["items"], (old) => old?.map((i) => i));
    nav.close();
    let undone = false;
    const timer = setTimeout(() => {
      if (undone) return;
      deleteItem(item.id)
        .then(() => qc.setQueryData<Item[]>(["items"], (old) => old?.filter((i) => i.id !== item.id)))
        .catch(() => {
          hiddenItems.delete(item.id);
          toast("削除できません");
        })
        .finally(() => hiddenItems.delete(item.id));
    }, 4200);
    toast("削除しました", {
      label: "元に戻す",
      run: () => {
        undone = true;
        clearTimeout(timer);
        hiddenItems.delete(item.id);
        qc.setQueryData<Item[]>(["items"], (old) => old?.map((i) => i));
      },
    });
  };

  const perWear = item.price && item.wearCount ? Math.round(item.price / item.wearCount) : null;

  return (
    <motion.div
      className="fixed inset-0 z-40 overflow-y-auto bg-paper/[0.94] backdrop-blur-2xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      data-testid="item-detail"
    >
      <div className="mx-auto max-w-md pb-[calc(var(--safe-bottom)+40px)]">
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-4"
          style={{ paddingTop: "calc(var(--safe-top) + 12px)" }}
        >
          <Button className="h-11 w-11" onClick={() => nav.close()} aria-label="戻る">
            <ChevronLeft size={22} />
          </Button>
          <Button className="h-11 w-11" onClick={remove} aria-label="削除" data-testid="delete">
            <Trash2 size={19} />
          </Button>
        </div>

        <div className="px-10 pt-2">
          <ItemImage
            item={item}
            layoutId={`item-${item.id}`}
            className="glass aspect-[3/4] w-full rounded-[32px]"
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="px-5 pt-5">
            <div className="text-[13px] text-ink-2">{colorName(item.color)}</div>
            <div className="flex items-center justify-between">
              <h2 className="text-[22px] font-bold">{subLabel(item.category, item.subcategory)}</h2>
              <Button
                className="h-9 px-3.5 text-[13px]"
                onClick={() => setEditing((e) => !e)}
                data-testid="edit"
              >
                <PencilLine size={14} /> 編集
              </Button>
            </div>
          </div>

          {editing && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              className="overflow-hidden"
            >
              <TagEditor tags={tagsOf(item)} onChange={onTags} gender={me.data?.gender ?? null} />
              <div className="flex gap-2 px-5 py-2">
                <PriceInput item={item} />
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-3 gap-2 px-5 pt-4">
            <Stat label="組める">
              <CountUp value={info.count} />
              <span className="text-[12px] font-medium">通り</span>
            </Stat>
            <Stat label="着た">
              {item.wearCount}
              <span className="text-[12px] font-medium">回</span>
            </Stat>
            <Stat label="1回あたり">{perWear !== null ? `¥${perWear.toLocaleString()}` : "—"}</Stat>
          </div>

          {info.similar.length > 0 && (
            <Section title="似ている手持ち">
              <ItemStrip
                items={info.similar.map((s) => s.item)}
                badge={(it) =>
                  `${Math.round((info.similar.find((s) => s.item.id === it.id)?.score ?? 0) * 100)}%`
                }
              />
            </Section>
          )}

          <Section
            title="合う手持ち"
            right={<span className="num text-[12px] text-ink-2">{info.matches.length}着</span>}
          >
            {info.matches.length ? (
              <ItemStrip items={info.matches} marks={orphans} />
            ) : (
              <div className="px-5 text-[13px] text-ink-2 num">0着</div>
            )}
          </Section>
        </motion.div>
      </div>
    </motion.div>
  );
}

function PriceInput({ item }: { item: Item }) {
  const update = useUpdateItem();
  const [brand, setBrand] = useState(item.brand ?? "");
  const [price, setPrice] = useState(item.price ? String(item.price) : "");
  const save = () =>
    update.mutate({
      id: item.id,
      brand: brand.trim() || null,
      price: price ? Number(price.replace(/\D/g, "")) || null : null,
    });
  return (
    <>
      <input
        value={brand}
        onChange={(e) => setBrand(e.target.value)}
        onBlur={save}
        placeholder="ブランド"
        className="glass min-w-0 flex-1 rounded-full px-4 py-2.5 text-[14px] outline-none"
      />
      <input
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        onBlur={save}
        placeholder="価格"
        inputMode="numeric"
        className="glass num w-28 rounded-full px-4 py-2.5 text-[14px] outline-none"
      />
    </>
  );
}
