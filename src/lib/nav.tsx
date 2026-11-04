import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type Tab = "today" | "closet" | "shop" | "me";
export const TABS: Tab[] = ["today", "closet", "shop", "me"];

export type Overlay =
  | { type: "camera"; mode: "register" | "check"; onboarding?: boolean; url?: string }
  | { type: "item"; id: string }
  | { type: "review" };

interface Nav {
  tab: Tab;
  prevTab: Tab;
  setTab: (t: Tab) => void;
  overlays: Overlay[];
  open: (o: Overlay) => void;
  close: () => void;
  closeAll: () => void;
}

const Ctx = createContext<Nav | null>(null);

/**
 * タブと重ねて開く画面の状態。ブラウザの「戻る」で一番上の画面が閉じるよう履歴と連動させる。
 */
export function NavProvider({ children }: { children: ReactNode }) {
  const [tab, setTabState] = useState<Tab>("today");
  const [prevTab, setPrevTab] = useState<Tab>("today");
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const depth = useRef(0);

  useEffect(() => {
    const onPop = () => {
      if (depth.current > 0) {
        depth.current--;
        setOverlays((o) => o.slice(0, -1));
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const setTab = useCallback(
    (t: Tab) => {
      setPrevTab(tab);
      setTabState(t);
      window.scrollTo({ top: 0 });
    },
    [tab],
  );

  const open = useCallback((o: Overlay) => {
    depth.current++;
    history.pushState({ overlay: depth.current }, "");
    setOverlays((s) => [...s, o]);
  }, []);

  const close = useCallback(() => {
    if (depth.current > 0) history.back();
  }, []);

  const closeAll = useCallback(() => {
    const n = depth.current;
    if (n > 0) {
      depth.current = 0;
      setOverlays([]);
      history.go(-n);
    }
  }, []);

  const value = useMemo(
    () => ({ tab, prevTab, setTab, overlays, open, close, closeAll }),
    [tab, prevTab, setTab, overlays, open, close, closeAll],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNav() {
  const v = useContext(Ctx);
  if (!v) throw new Error("NavProvider missing");
  return v;
}
