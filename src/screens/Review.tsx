import { Check, ChevronLeft } from "lucide-react";
import { AnimatePresence, motion, type PanInfo, useMotionValue, useTransform } from "motion/react";
import { useEffect, useState } from "react";
import { Button } from "../components/Glass";
import { ItemImage } from "../components/ItemImage";
import { TagEditor, tagsOf } from "../components/TagEditor";
import { useMe, useUpdateItem } from "../lib/api";
import { useWardrobe } from "../lib/hooks";
import { vibrate } from "../lib/image";
import { useNav } from "../lib/nav";
import type { Gender, Item, ItemTags } from "../shared/types";

/** 確認待ち：右へ投げると確定。札を押せばその場で直る */
export function ReviewScreen() {
  const nav = useNav();
  const { items } = useWardrobe();
  const [queue] = useState(() => items.filter((i) => i.status === "review").map((i) => i.id));
  const [pos, setPos] = useState(0);
  const update = useUpdateItem();
  const me = useMe();

  const current = items.find((i) => i.id === queue[pos]);
  const next = items.find((i) => i.id === queue[pos + 1]);
  const done = pos >= queue.length;

  useEffect(() => {
    if (done) {
      const t = setTimeout(() => nav.close(), 900);
      return () => clearTimeout(t);
    }
  }, [done, nav]);

  const confirm = (it: Item, tags: ItemTags) => {
    vibrate(8);
    update.mutate({ id: it.id, ...tags, status: "ready" });
    setPos((p) => p + 1);
  };

  return (
    <motion.div
      className="fixed inset-0 z-40 bg-paper/[0.94] backdrop-blur-2xl"
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 300, damping: 34 }}
      data-testid="review"
    >
      <div className="mx-auto flex h-full max-w-md flex-col">
        <div
          className="flex items-center justify-between px-4"
          style={{ paddingTop: "calc(var(--safe-top) + 12px)" }}
        >
          <Button className="h-11 w-11" onClick={() => nav.close()} aria-label="閉じる">
            <ChevronLeft size={22} />
          </Button>
          <div className="num text-[14px] font-semibold">
            {Math.min(pos + 1, queue.length)} / {queue.length}
          </div>
          <div className="w-11" />
        </div>

        <div className="relative mt-3 min-h-0 flex-1">
          <AnimatePresence>
            {done && (
              <motion.div
                key="done"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-buy text-white">
                  <Check size={44} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {next && <Card key={next.id} item={next} behind />}
          <AnimatePresence>
            {current && (
              <Card
                key={current.id}
                item={current}
                gender={me.data?.gender ?? null}
                onConfirm={(t) => confirm(current, t)}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

function Card({
  item,
  behind,
  onConfirm,
  gender = null,
}: {
  item: Item;
  behind?: boolean;
  onConfirm?: (t: ItemTags) => void;
  gender?: Gender | null;
}) {
  const [tags, setTags] = useState<ItemTags>(() => tagsOf(item));
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-10, 0, 10]);
  const okOpacity = useTransform(x, [0, 120], [0, 1]);
  const [exitX, setExitX] = useState(600);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > 110 || info.velocity.x > 600) {
      setExitX(600);
      onConfirm?.(tags);
    }
  };

  return (
    <motion.div
      className="glass glass-strong absolute inset-x-4 bottom-[calc(var(--safe-bottom)+16px)] top-0 flex flex-col overflow-hidden rounded-[32px]"
      style={{ x, rotate, zIndex: behind ? 1 : 2 }}
      initial={behind ? { scale: 0.94, y: 16, opacity: 0.6 } : { scale: 0.94, y: 16 }}
      animate={behind ? { scale: 0.94, y: 16, opacity: 0.6 } : { scale: 1, y: 0, opacity: 1 }}
      exit={{ x: exitX, opacity: 0, rotate: 14, transition: { duration: 0.32 } }}
      drag={behind ? false : "x"}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={onDragEnd}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
    >
      {!behind && (
        <>
          <div className="relative mx-auto mt-4 aspect-[3/4] w-[52%] shrink-0">
            <ItemImage item={item} className="h-full w-full rounded-[24px]" />
            <motion.div
              style={{ opacity: okOpacity }}
              className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full bg-buy text-white"
            >
              <Check size={24} />
            </motion.div>
          </div>
          <div
            className="min-h-0 flex-1 overflow-y-auto py-2"
            onPointerDownCapture={(e) => e.stopPropagation()}
          >
            <TagEditor tags={tags} onChange={setTags} gender={gender} />
          </div>
          <div className="shrink-0 px-5 pb-5 pt-2">
            <Button
              variant="ink"
              className="h-12 w-full text-[15px]"
              onClick={() => onConfirm?.(tags)}
              data-testid="confirm"
            >
              <Check size={18} /> 確定
            </Button>
          </div>
        </>
      )}
    </motion.div>
  );
}
