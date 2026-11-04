import { motion } from "motion/react";
import type { Item } from "../shared/types";
import { ItemImage } from "./ItemImage";

type Slot = { left: string; top: string; width: string; height: string; z: number; rotate: number };

/** 体の位置に服を並べる。アウターは左奥、トップス中央上、ボトムス中央下、靴は右下 */
function layout(pieces: Pick<Item, "category">[]): Slot[] {
  const hasOuter = pieces.some((p) => p.category === "outer");
  return pieces.map((p) => {
    switch (p.category) {
      case "outer":
        return { left: "4%", top: "6%", width: "48%", height: "56%", z: 1, rotate: -4 };
      case "top":
        return hasOuter
          ? { left: "34%", top: "4%", width: "54%", height: "44%", z: 3, rotate: 2 }
          : { left: "20%", top: "3%", width: "60%", height: "46%", z: 3, rotate: 0 };
      case "bottom":
        return hasOuter
          ? { left: "30%", top: "42%", width: "46%", height: "54%", z: 2, rotate: 0 }
          : { left: "22%", top: "42%", width: "50%", height: "55%", z: 2, rotate: -1 };
      case "onepiece":
        return { left: "24%", top: "4%", width: "52%", height: "88%", z: 2, rotate: 0 };
      default:
        return { left: "68%", top: "72%", width: "28%", height: "24%", z: 4, rotate: 6 };
    }
  });
}

export function OutfitBoard({
  pieces,
  onPiece,
  highlight,
  compact,
}: {
  pieces: Item[];
  onPiece?: (index: number) => void;
  highlight?: Set<string>;
  compact?: boolean;
}) {
  const slots = layout(pieces);
  return (
    <div className="relative h-full w-full">
      {pieces.map((p, i) => {
        const s = slots[i];
        return (
          <motion.button
            key={`${p.category}-${p.id}`}
            type="button"
            disabled={!onPiece}
            onClick={() => onPiece?.(i)}
            className="absolute"
            style={{ left: s.left, top: s.top, width: s.width, height: s.height, zIndex: s.z }}
            initial={{ opacity: 0, scale: 0.85, rotate: s.rotate - 6 }}
            animate={{ opacity: 1, scale: 1, rotate: s.rotate }}
            exit={{ opacity: 0, scale: 0.85 }}
            whileTap={onPiece ? { scale: 0.94 } : undefined}
            transition={{ type: "spring", stiffness: 320, damping: 26, delay: i * 0.05 }}
          >
            <ItemImage
              item={p}
              className={`h-full w-full ${compact ? "rounded-[14px]" : "rounded-[22px]"} ${
                p.cutoutKey ? "!bg-transparent" : "shadow-[0_6px_20px_rgb(20_24_40/0.10)]"
              }`}
            />
            {highlight?.has(p.id) && (
              <span className="absolute left-1 top-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-white">
                出番なし
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
