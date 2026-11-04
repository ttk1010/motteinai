import { motion, type PanInfo, useDragControls } from "motion/react";
import type { ReactNode } from "react";

/** 下から上がるガラスのシート。つまみを下に引くと閉じる */
export function Sheet({
  children,
  onClose,
  className = "",
  zIndex = 50,
  label,
}: {
  children: ReactNode;
  onClose: () => void;
  className?: string;
  zIndex?: number;
  label?: string;
}) {
  const controls = useDragControls();
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 600) onClose();
  };
  return (
    <div className="fixed inset-0" style={{ zIndex }} role="dialog" aria-modal="true" aria-label={label}>
      <motion.div
        className="absolute inset-0 bg-[rgb(11_11_15/0.18)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        style={{ background: "rgb(255 255 255 / 0.86)" }}
        className={`glass absolute inset-x-0 bottom-0 mx-auto flex max-h-[92dvh] max-w-md flex-col rounded-t-[32px] ${className}`}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 340, damping: 34 }}
        drag="y"
        dragControls={controls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.05, bottom: 0.8 }}
        onDragEnd={onDragEnd}
      >
        <div
          className="flex shrink-0 cursor-grab touch-none justify-center pb-2 pt-3"
          onPointerDown={(e) => controls.start(e)}
        >
          <div className="h-1.5 w-10 rounded-full bg-ink/15" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[calc(var(--safe-bottom)+20px)]">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
