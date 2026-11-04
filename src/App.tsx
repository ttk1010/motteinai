import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { Backdrop, GlassFilters } from "./components/Glass";
import { Sk } from "./components/Skeleton";
import { TabBar } from "./components/TabBar";
import { Toaster } from "./components/Toast";
import { useMe } from "./lib/api";
import { NavProvider, TABS, useNav } from "./lib/nav";
import { CameraScreen } from "./screens/Camera";
import { ClosetScreen } from "./screens/Closet";
import { ItemDetail } from "./screens/ItemDetail";
import { LoginScreen } from "./screens/Login";
import { MeScreen } from "./screens/Me";
import { ReviewScreen } from "./screens/Review";
import { SetupScreen } from "./screens/Setup";
import { ShopScreen } from "./screens/Shop";
import { TodayScreen } from "./screens/Today";

function Screens() {
  const nav = useNav();
  const dir = TABS.indexOf(nav.tab) - TABS.indexOf(nav.prevTab);
  const Screen = { today: TodayScreen, closet: ClosetScreen, shop: ShopScreen, me: MeScreen }[nav.tab];
  return (
    <AnimatePresence mode="popLayout" initial={false} custom={dir}>
      <motion.main
        key={nav.tab}
        custom={dir}
        variants={{
          enter: (d: number) => ({ x: d >= 0 ? 40 : -40, opacity: 0 }),
          center: { x: 0, opacity: 1 },
          exit: (d: number) => ({ x: d >= 0 ? -40 : 40, opacity: 0 }),
        }}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ type: "spring", stiffness: 380, damping: 36 }}
        className="mx-auto min-h-dvh max-w-md pb-[calc(var(--safe-bottom)+110px)]"
      >
        <Screen />
      </motion.main>
    </AnimatePresence>
  );
}

function Overlays() {
  const nav = useNav();
  return (
    <AnimatePresence>
      {nav.overlays.map((o, i) => {
        const key = `${i}-${o.type}`;
        if (o.type === "camera")
          return <CameraScreen key={key} mode={o.mode} onboarding={o.onboarding} initialUrl={o.url} />;
        if (o.type === "item") return <ItemDetail key={`${key}-${o.id}`} id={o.id} />;
        return <ReviewScreen key={key} />;
      })}
    </AnimatePresence>
  );
}

/** PWA のショートカットと共有メニューからの起動 */
function useLaunchActions(enabled: boolean) {
  const nav = useNav();
  const done = useRef(false);
  useEffect(() => {
    if (!enabled || done.current) return;
    done.current = true;
    const q = new URLSearchParams(location.search);
    const action = q.get("action");
    const shared = q.get("shared_url") || q.get("shared_text")?.match(/https?:\/\/\S+/)?.[0];
    if (action || shared) history.replaceState(null, "", "/");
    if (shared) nav.open({ type: "camera", mode: "check", url: shared });
    else if (action === "check") nav.open({ type: "camera", mode: "check" });
    else if (action === "add") nav.open({ type: "camera", mode: "register" });
  }, [enabled, nav]);
}

function Shell() {
  const me = useMe();
  const nav = useNav();
  const ready = !!me.data && !!me.data.gender;
  useLaunchActions(ready);

  if (me.isLoading)
    return (
      <div className="mx-auto max-w-md px-5 pt-[calc(var(--safe-top)+22px)]">
        <Sk className="h-7 w-36" />
        <Sk className="mt-6 aspect-[4/5] w-full rounded-[28px]" />
      </div>
    );
  if (me.isError)
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <button type="button" className="glass rounded-full px-6 py-3" onClick={() => me.refetch()}>
          通信できません · 再試行
        </button>
      </div>
    );
  if (!me.data) return <LoginScreen />;
  if (!me.data.gender && nav.overlays.length === 0) return <SetupScreen />;

  return (
    <LayoutGroup>
      <Screens />
      <TabBar />
      <Overlays />
    </LayoutGroup>
  );
}

export function App() {
  useEffect(() => {
    // Chromium だけ屈折フィルタを有効にする
    if ("userAgentData" in navigator) document.documentElement.classList.add("refract");
  }, []);
  return (
    <NavProvider>
      <GlassFilters />
      <Backdrop />
      <Shell />
      <Toaster />
    </NavProvider>
  );
}
