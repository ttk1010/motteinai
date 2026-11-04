import { useEffect, useMemo, useState } from "react";
import { orphanIds } from "../shared/engine";
import type { Item } from "../shared/types";
import { useItems } from "./api";

/** 300ms 未満で読み込みが終わるならスケルトンを出さない（チラつき防止） */
export function useDelayed(active: boolean, ms = 300) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!active) {
      setShow(false);
      return;
    }
    const t = setTimeout(() => setShow(true), ms);
    return () => clearTimeout(t);
  }, [active, ms]);
  return show;
}

/** 提案に使えるアイテム（裏の処理が終わったもの。確認待ちも含む） */
export function useWardrobe() {
  const q = useItems();
  const usable = useMemo<Item[]>(() => (q.data ?? []).filter((i) => i.status !== "processing"), [q.data]);
  const orphans = useMemo(() => orphanIds(usable), [usable]);
  return { ...q, items: q.data ?? [], usable, orphans };
}

export function useReducedMotion() {
  const [r, setR] = useState(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const m = matchMedia("(prefers-reduced-motion: reduce)");
    const f = () => setR(m.matches);
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  return r;
}
