import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, useSyncExternalStore } from "react";

interface ToastData {
  id: number;
  text: string;
  action?: { label: string; run: () => void };
  ms: number;
}

let current: ToastData | null = null;
const listeners = new Set<() => void>();
let seq = 0;

export function toast(text: string, action?: ToastData["action"], ms = 4000) {
  current = { id: ++seq, text, action, ms };
  for (const l of listeners) l();
}

function dismiss(id: number) {
  if (current?.id === id) {
    current = null;
    for (const l of listeners) l();
  }
}

export function Toaster() {
  const t = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
  );
  const [, force] = useState(0);
  useEffect(() => {
    if (!t) return;
    const timer = setTimeout(() => {
      dismiss(t.id);
      force((n) => n + 1);
    }, t.ms);
    return () => clearTimeout(timer);
  }, [t]);
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[80] flex justify-center px-4"
      style={{ bottom: "calc(var(--safe-bottom) + 92px)" }}
    >
      <AnimatePresence>
        {t && (
          <motion.div
            key={t.id}
            role="status"
            initial={{ y: 24, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="glass-dark pointer-events-auto flex items-center gap-4 rounded-full py-2.5 pl-5 pr-2.5 text-sm"
            style={{ background: "rgb(20 22 28 / 0.84)" }}
          >
            <span>{t.text}</span>
            {t.action && (
              <button
                type="button"
                className="rounded-full bg-white/15 px-3.5 py-1.5 font-semibold"
                onClick={() => {
                  t.action?.run();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
