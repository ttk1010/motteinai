import { motion } from "motion/react";
import { useState } from "react";
import { itemImage } from "../lib/api";
import type { Item } from "../shared/types";

/** 主色で塗った下地 → 画像が読み込まれたらふわっと表示 */
export function ItemImage({
  item,
  className = "",
  layoutId,
  fit = "contain",
}: {
  item: Pick<Item, "id" | "imageKey" | "cutoutKey" | "color" | "status"> & { localUrl?: string };
  className?: string;
  layoutId?: string;
  fit?: "contain" | "cover";
}) {
  const [loaded, setLoaded] = useState(false);
  const processing = item.status === "processing";
  return (
    <motion.div
      layoutId={layoutId}
      className={`relative overflow-hidden ${className}`}
      style={{ background: `color-mix(in srgb, ${item.color} 14%, white)` }}
      transition={{ type: "spring", stiffness: 380, damping: 36 }}
    >
      <motion.img
        src={item.localUrl ?? itemImage(item)}
        alt=""
        draggable={false}
        onLoad={() => setLoaded(true)}
        initial={false}
        animate={{ opacity: loaded ? 1 : 0, scale: loaded ? 1 : 0.96 }}
        transition={{ duration: 0.35 }}
        className={`h-full w-full ${fit === "contain" ? "object-contain p-[8%]" : "object-cover"} ${
          item.cutoutKey ? "drop-shadow-[0_6px_10px_rgb(20_24_40/0.14)]" : ""
        }`}
      />
      {processing && <div className="shimmer absolute inset-0" role="status" aria-label="処理中" />}
    </motion.div>
  );
}
