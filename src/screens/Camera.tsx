import { Camera as CameraIcon, Check, Images, Link2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CountUp } from "../components/CountUp";
import { Button, Glass } from "../components/Glass";
import { toast } from "../components/Toast";
import { importUrl, uploadItem } from "../lib/api";
import { useWardrobe } from "../lib/hooks";
import { type Prepared, prepareImage, vibrate } from "../lib/image";
import { useNav } from "../lib/nav";
import { validCores } from "../shared/engine";
import { type Candidate, CheckResult } from "./CheckResult";

type Source = "shoot" | "photos" | "url";
type TrayItem = { id: number; url: string; state: "uploading" | "done" | "error" };

const ONBOARD_GOAL = 10;

export function CameraScreen({
  mode,
  onboarding,
  initialUrl,
}: {
  mode: "register" | "check";
  onboarding?: boolean;
  initialUrl?: string;
}) {
  const nav = useNav();
  const { items, usable } = useWardrobe();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<Source>(initialUrl ? "url" : "shoot");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [camError, setCamError] = useState(false);
  const [tray, setTray] = useState<TrayItem[]>([]);
  const [flying, setFlying] = useState<{ id: number; url: string } | null>(null);
  const [flash, setFlash] = useState(0);
  const [url, setUrl] = useState(initialUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [onboardDone, setOnboardDone] = useState(false);
  const seq = useRef(0);
  const active = useRef(0);
  const waiting = useRef<(() => void)[]>([]);
  const startCount = useRef(items.length);

  /* カメラ */
  useEffect(() => {
    if (source !== "shoot") return;
    let s: MediaStream | null = null;
    let cancelled = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("no camera");
        s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1440 } },
          audio: false,
        });
        if (cancelled) {
          for (const t of s.getTracks()) t.stop();
          return;
        }
        setStream(s);
        setCamError(false);
        if (videoRef.current) videoRef.current.srcObject = s;
      } catch {
        if (!cancelled) setCamError(true);
      }
    })();
    return () => {
      cancelled = true;
      if (s) for (const t of s.getTracks()) t.stop();
      setStream(null);
    };
  }, [source]);

  /* 登録：撮った順に裏で送る（2並列） */
  const enqueue = useCallback((p: Prepared) => {
    const id = ++seq.current;
    setTray((t) => [...t, { id, url: p.previewUrl, state: "uploading" }]);
    setFlying({ id, url: p.previewUrl });
    const run = () =>
      uploadItem(p.blob, p.color)
        .then(() => setTray((t) => t.map((x) => (x.id === id ? { ...x, state: "done" } : x))))
        .catch(() => setTray((t) => t.map((x) => (x.id === id ? { ...x, state: "error" } : x))));
    const start = () => {
      active.current++;
      run().finally(() => {
        active.current--;
        waiting.current.shift()?.();
      });
    };
    if (active.current < 2) start();
    else waiting.current.push(start);
  }, []);

  const handle = useCallback(
    async (p: Prepared) => {
      if (mode === "register") enqueue(p);
      else setCandidate({ ...p, tags: null });
    },
    [mode, enqueue],
  );

  const shoot = async () => {
    const v = videoRef.current;
    if (!v?.videoWidth) return;
    vibrate(12);
    setFlash((f) => f + 1);
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")?.drawImage(v, 0, 0);
    await handle(await prepareImage(c));
  };

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = mode === "check" ? [files[0]] : [...files].slice(0, 50);
    for (const f of list) {
      try {
        await handle(await prepareImage(f));
      } catch {
        toast("読み込めない画像があります");
      }
    }
  };

  const onUrl = async () => {
    if (!url.trim()) return;
    setBusy(true);
    try {
      const blob = await importUrl(url.trim());
      await handle(await prepareImage(blob));
      setUrl("");
    } catch {
      toast("画像を取得できません");
    } finally {
      setBusy(false);
    }
  };

  const pasteUrl = async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (t) setUrl(t.trim());
    } catch {}
  };

  /* 初回：10着で最初の提案 */
  const uploadedCount = startCount.current + tray.filter((t) => t.state !== "error").length;
  const onboardCount = Math.max(items.length, uploadedCount);
  const allUploaded = tray.every((t) => t.state !== "uploading");
  const processing = items.some((i) => i.status === "processing");
  const coreCount = useMemo(() => validCores(usable).length, [usable]);
  useEffect(() => {
    if (onboarding && onboardCount >= ONBOARD_GOAL && allUploaded && tray.length > 0) setOnboardDone(true);
  }, [onboarding, onboardCount, allUploaded, tray.length]);

  const finish = () => {
    nav.closeAll();
    if (onboarding) nav.setTab("today");
  };

  const pending = tray.filter((t) => t.state === "uploading").length;

  return (
    <motion.div
      className="fixed inset-0 z-40 bg-black text-white"
      initial={{ clipPath: "circle(0% at 50% calc(100% - 50px))" }}
      animate={{ clipPath: "circle(150% at 50% calc(100% - 50px))" }}
      exit={{ clipPath: "circle(0% at 50% calc(100% - 50px))" }}
      transition={{ type: "spring", stiffness: 160, damping: 26 }}
      data-testid="camera"
    >
      {/* プレビュー */}
      <div className="absolute inset-0">
        {source === "shoot" && !camError && (
          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
        )}
        {(source !== "shoot" || camError) && (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-[#1b1d24] to-[#0d0e12]">
            {source === "photos" || camError ? (
              <Button
                variant="plain"
                onClick={() => fileRef.current?.click()}
                className="glass-dark h-14 px-6 text-[15px]"
                data-testid="pick-photos"
              >
                <Images size={20} /> 写真を選ぶ
              </Button>
            ) : (
              <div className="w-full max-w-sm px-6">
                <div className="glass-dark flex items-center gap-2 rounded-full py-1.5 pl-4 pr-1.5">
                  <Link2 size={18} className="shrink-0 opacity-70" />
                  <input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && onUrl()}
                    placeholder="https://"
                    inputMode="url"
                    className="min-w-0 flex-1 bg-transparent py-2 text-[15px] outline-none placeholder:text-white/40"
                    aria-label="商品ページのURL"
                  />
                  {url ? (
                    <Button
                      variant="plain"
                      onClick={onUrl}
                      disabled={busy}
                      className="h-10 bg-white px-4 text-ink"
                    >
                      {busy ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink/20 border-t-ink" />
                      ) : (
                        "取得"
                      )}
                    </Button>
                  ) : (
                    <Button variant="plain" onClick={pasteUrl} className="h-10 bg-white/15 px-4">
                      貼り付け
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        {/* 撮影ガイド */}
        {source === "shoot" && stream && (
          <div className="pointer-events-none absolute inset-x-[12%] top-[18%] bottom-[30%] rounded-[36px] border border-white/25" />
        )}
      </div>

      {/* シャッターの光 */}
      <AnimatePresence>
        {flash > 0 && (
          <motion.div
            key={flash}
            className="pointer-events-none absolute inset-0 bg-white"
            initial={{ opacity: 0.85 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          />
        )}
      </AnimatePresence>

      {/* 上部 */}
      <div
        className="absolute inset-x-0 top-0 flex items-center justify-between px-4"
        style={{ paddingTop: "calc(var(--safe-top) + 12px)" }}
      >
        <Button
          variant="plain"
          onClick={() => nav.close()}
          className="glass-dark h-11 w-11"
          aria-label="閉じる"
        >
          <X size={22} />
        </Button>
        <div className="glass-dark rounded-full px-4 py-2 text-[13px] font-semibold">
          {mode === "check" ? "買う前チェック" : "登録"}
        </div>
        {onboarding && mode === "register" ? (
          <ProgressRing value={Math.min(onboardCount, ONBOARD_GOAL)} max={ONBOARD_GOAL} />
        ) : (
          <div className="w-11" />
        )}
      </div>

      {/* 下部の操作 */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{ paddingBottom: "calc(var(--safe-bottom) + 18px)" }}
      >
        <div className="relative mx-auto flex max-w-md items-center justify-between px-8">
          {/* 置き場 */}
          <div className="relative h-14 w-14">
            {tray.slice(-3).map((t, i, arr) => (
              <motion.img
                key={t.id}
                src={t.url}
                alt=""
                className={`absolute inset-0 h-14 w-14 rounded-2xl border-2 border-white object-cover ${t.state === "error" ? "opacity-40" : ""}`}
                style={{ rotate: (i - (arr.length - 1)) * 7 }}
                initial={false}
                animate={{ scale: 1 }}
              />
            ))}
            {tray.length > 0 && (
              <motion.span
                key={tray.length}
                initial={{ scale: 0.4 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 600, damping: 18 }}
                className="num absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-1.5 text-[12px] font-bold text-ink"
                data-testid="tray-count"
              >
                {tray.length}
              </motion.span>
            )}
          </div>

          {/* シャッター */}
          {source === "shoot" && !camError ? (
            <motion.button
              type="button"
              onClick={shoot}
              whileTap={{ scale: 0.88 }}
              transition={{ type: "spring", stiffness: 600, damping: 22 }}
              className="flex h-[78px] w-[78px] items-center justify-center rounded-full border-[3px] border-white/90"
              aria-label="撮影"
              data-testid="shutter"
            >
              <span className="h-[62px] w-[62px] rounded-full bg-white" />
            </motion.button>
          ) : (
            <div className="h-[78px] w-[78px]" />
          )}

          {/* 完了 */}
          {mode === "register" && tray.length > 0 ? (
            <Button
              variant="plain"
              onClick={finish}
              className="h-14 w-14 bg-white text-ink"
              aria-label="完了"
              data-testid="done"
            >
              {pending ? <span className="num text-sm font-bold">{pending}</span> : <Check size={24} />}
            </Button>
          ) : (
            <div className="h-14 w-14" />
          )}
        </div>

        {/* 撮影 / 写真 / URL */}
        <div className="mt-4 flex justify-center">
          <div className="glass-dark flex rounded-full p-1">
            {(
              [
                ["shoot", "撮影", CameraIcon],
                ["photos", "写真", Images],
                ["url", "URL", Link2],
              ] as const
            ).map(([k, label, Icon]) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setSource(k);
                  if (k === "photos") setTimeout(() => fileRef.current?.click(), 50);
                }}
                className="relative flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px]"
              >
                {source === k && (
                  <motion.span
                    layoutId="cam-src"
                    className="absolute inset-0 rounded-full bg-white/20"
                    transition={{ type: "spring", stiffness: 450, damping: 34 }}
                  />
                )}
                <Icon size={15} className="relative" />
                <span className="relative">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 撮った写真が置き場へ飛ぶ */}
      <AnimatePresence>
        {flying && (
          <motion.img
            key={flying.id}
            src={flying.url}
            alt=""
            className="pointer-events-none absolute rounded-3xl border-2 border-white object-cover shadow-2xl"
            style={{ left: "50%", top: "45%", width: 220, height: 280, x: "-50%", y: "-50%" }}
            initial={{ scale: 1, opacity: 1 }}
            animate={{
              left: 60,
              top: "calc(100% - 108px - var(--safe-bottom))",
              width: 56,
              height: 56,
              opacity: 0.9,
            }}
            transition={{ type: "spring", stiffness: 200, damping: 24 }}
            onAnimationComplete={() => setFlying((f) => (f?.id === flying.id ? null : f))}
          />
        )}
      </AnimatePresence>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple={mode === "register"}
        className="hidden"
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = "";
        }}
        data-testid="file-input"
      />

      {/* 買う前チェックの結果 */}
      <AnimatePresence>
        {candidate && (
          <CheckResult
            key={candidate.previewUrl}
            candidate={candidate}
            onClose={() => setCandidate(null)}
            onDone={() => {
              setCandidate(null);
              nav.close();
            }}
          />
        )}
      </AnimatePresence>

      {/* 初回：最初の提案 */}
      <AnimatePresence>
        {onboardDone && (
          <motion.div
            className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 px-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Glass
              strong
              className="w-full max-w-xs rounded-[32px] p-7 text-center text-ink"
              initial={{ scale: 0.8, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
            >
              <div className="text-[13px] text-ink-2">コーデ</div>
              <div className="my-1 flex items-baseline justify-center gap-1">
                {processing ? (
                  <span className="sk inline-block h-14 w-24 rounded-2xl" />
                ) : (
                  <CountUp value={coreCount} className="text-[56px] font-bold leading-none" />
                )}
                <span className="text-lg font-bold">通り</span>
              </div>
              <Button
                variant="ink"
                onClick={finish}
                className="mt-5 h-12 w-full text-[15px]"
                disabled={processing}
              >
                見る
              </Button>
            </Glass>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ProgressRing({ value, max }: { value: number; max: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  return (
    <div
      className="glass-dark relative flex h-11 w-11 items-center justify-center rounded-full"
      data-testid="onboard-ring"
    >
      <svg viewBox="0 0 44 44" className="absolute inset-0 -rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" stroke="rgb(255 255 255 / 0.2)" strokeWidth="3" />
        <motion.circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          animate={{ strokeDashoffset: c * (1 - value / max) }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </svg>
      <span className="num relative text-[12px] font-bold">{value}</span>
    </div>
  );
}
