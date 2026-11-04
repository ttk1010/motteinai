import { Download, LogOut, MapPin, Trash2 } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useState } from "react";
import { Button, Chip, Glass } from "../components/Glass";
import { Sheet } from "../components/Sheet";
import { MeSkeleton } from "../components/Skeleton";
import { ScreenHeader } from "../components/Strip";
import { toast } from "../components/Toast";
import { deleteAccount, logout, useMe, useUpdateMe } from "../lib/api";
import { useDelayed, useWardrobe } from "../lib/hooks";
import type { Gender } from "../shared/types";

export const GENDER_LABEL: Record<Gender, string> = { mens: "メンズ", womens: "レディース", all: "両方" };

export function useLocate() {
  const update = useUpdateMe();
  const [busy, setBusy] = useState(false);
  const locate = () => {
    if (!navigator.geolocation) return toast("位置情報を使えません");
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        update.mutate({ lat: p.coords.latitude, lon: p.coords.longitude, place: "現在地" });
        setBusy(false);
      },
      () => {
        toast("位置情報を使えません");
        setBusy(false);
      },
      { timeout: 10000, maximumAge: 3600_000 },
    );
  };
  return { locate, busy };
}

export function MeScreen() {
  const me = useMe();
  const { items } = useWardrobe();
  const update = useUpdateMe();
  const { locate, busy } = useLocate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const showSk = useDelayed(me.isLoading);

  if (me.isLoading || !me.data) return showSk ? <MeSkeleton /> : null;
  const u = me.data;

  return (
    <div>
      <ScreenHeader title="自分" />
      <div className="space-y-3 px-5">
        <Glass className="flex items-center gap-3.5 rounded-[28px] p-4">
          {u.picture ? (
            <img src={u.picture} alt="" referrerPolicy="no-referrer" className="h-12 w-12 rounded-full" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink text-lg font-bold text-white">
              {u.name.slice(0, 1)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{u.name}</div>
            <div className="truncate text-[12px] text-ink-2">{u.email}</div>
          </div>
          <div className="text-right">
            <div className="num text-[20px] font-bold leading-none">{items.length}</div>
            <div className="text-[11px] text-ink-2">着</div>
          </div>
        </Glass>

        <Glass className="rounded-[28px] py-3">
          <div className="px-4 pb-2 text-[12px] font-medium text-ink-2">服の傾向</div>
          <div className="flex gap-1.5 px-4">
            {(Object.keys(GENDER_LABEL) as Gender[]).map((g) => (
              <Chip key={g} active={u.gender === g} onClick={() => update.mutate({ gender: g })}>
                {GENDER_LABEL[g]}
              </Chip>
            ))}
          </div>
          <div className="mx-4 my-3 h-px bg-ink/5" />
          <div className="flex items-center justify-between px-4">
            <div>
              <div className="text-[12px] font-medium text-ink-2">天気の地域</div>
              <div className="text-[14px]">{u.place ?? "東京"}</div>
            </div>
            <Button className="h-9 px-3.5 text-[13px]" onClick={locate} disabled={busy}>
              <MapPin size={15} /> 現在地
            </Button>
          </div>
        </Glass>

        <Glass className="overflow-hidden rounded-[28px]">
          <a href="/api/export" download className="flex items-center gap-3 px-4 py-3.5 text-[15px]">
            <Download size={18} /> データを書き出す
          </a>
          <div className="mx-4 h-px bg-ink/5" />
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-[15px]"
          >
            <LogOut size={18} /> ログアウト
          </button>
          <div className="mx-4 h-px bg-ink/5" />
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-[15px] text-skip"
          >
            <Trash2 size={18} /> アカウントを削除
          </button>
        </Glass>
      </div>

      <AnimatePresence>
        {confirmDelete && (
          <Sheet onClose={() => setConfirmDelete(false)} label="アカウントの削除">
            <div className="px-5 pb-2 pt-1">
              <div className="text-[17px] font-bold">アカウントを削除</div>
              <div className="num mt-1 text-[13px] text-ink-2">服 {items.length}着と記録がすべて消えます</div>
              <div className="mt-5 flex gap-2.5">
                <Button className="h-12 flex-1" onClick={() => setConfirmDelete(false)}>
                  やめる
                </Button>
                <Button
                  variant="plain"
                  className="h-12 flex-1 bg-skip text-white"
                  onClick={() => deleteAccount().catch(() => toast("削除できません"))}
                >
                  削除
                </Button>
              </div>
            </div>
          </Sheet>
        )}
      </AnimatePresence>
    </div>
  );
}
