import { Home, type LucideIcon, Plus, Shirt, ShoppingBag, UserRound } from "lucide-react";
import { motion } from "motion/react";
import { useRef } from "react";
import { vibrate } from "../lib/image";
import { type Tab, useNav } from "../lib/nav";

const ITEMS: { tab: Tab; icon: LucideIcon; label: string }[] = [
  { tab: "today", icon: Home, label: "今日" },
  { tab: "closet", icon: Shirt, label: "クローゼット" },
  { tab: "shop", icon: ShoppingBag, label: "買い物" },
  { tab: "me", icon: UserRound, label: "自分" },
];

function TabButton({ tab, icon: Icon, label }: (typeof ITEMS)[number]) {
  const nav = useNav();
  const active = nav.tab === tab;
  return (
    <button
      type="button"
      onClick={() => nav.setTab(tab)}
      className="relative flex h-14 flex-1 flex-col items-center justify-center gap-0.5"
      aria-current={active ? "page" : undefined}
    >
      {active && (
        <motion.span
          layoutId="tab-drop"
          className="absolute inset-x-1 inset-y-1.5 rounded-full bg-white/80 shadow-[inset_0_1px_0_#fff,0_4px_14px_rgb(20_24_40/0.10)]"
          transition={{ type: "spring", stiffness: 420, damping: 32, mass: 0.8 }}
        />
      )}
      <motion.span
        animate={{ y: active ? -1 : 0, scale: active ? 1.06 : 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="relative"
      >
        <Icon size={21} strokeWidth={active ? 2.2 : 1.7} className={active ? "text-ink" : "text-ink-2"} />
      </motion.span>
      <span className={`relative text-[10px] ${active ? "font-semibold text-ink" : "text-ink-2"}`}>
        {label}
      </span>
    </button>
  );
}

export function TabBar() {
  const nav = useNav();
  const pressTimer = useRef<number | null>(null);
  const longPressed = useRef(false);

  const startPress = () => {
    longPressed.current = false;
    pressTimer.current = window.setTimeout(() => {
      longPressed.current = true;
      vibrate(18);
      nav.open({ type: "camera", mode: "check" });
    }, 450);
  };
  const endPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 px-3"
      style={{ paddingBottom: "calc(var(--safe-bottom) + 10px)" }}
      aria-label="メイン"
    >
      <div className="relative mx-auto flex max-w-md items-center">
        <div className="glass glass-refract flex flex-1 items-center rounded-full px-1.5">
          <TabButton {...ITEMS[0]} />
          <TabButton {...ITEMS[1]} />
          <div className="w-[72px] shrink-0" />
          <TabButton {...ITEMS[2]} />
          <TabButton {...ITEMS[3]} />
        </div>
        <motion.button
          type="button"
          aria-label="登録（長押しで買う前チェック）"
          data-testid="fab"
          onPointerDown={startPress}
          onPointerUp={endPress}
          onPointerLeave={endPress}
          onContextMenu={(e) => e.preventDefault()}
          onClick={() => {
            if (longPressed.current) return;
            vibrate();
            nav.open({ type: "camera", mode: "register" });
          }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: "spring", stiffness: 500, damping: 26 }}
          className="absolute left-1/2 top-1/2 flex h-[62px] w-[62px] -translate-x-1/2 -translate-y-1/2 select-none items-center justify-center rounded-full bg-ink text-white shadow-[0_10px_30px_rgb(11_11_15/0.35),inset_0_1px_0_rgb(255_255_255/0.25)]"
          style={{ WebkitTouchCallout: "none" }}
        >
          <Plus size={28} strokeWidth={2.2} />
        </motion.button>
      </div>
    </nav>
  );
}
