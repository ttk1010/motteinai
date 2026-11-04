import { Camera, Check, CloudRain, CloudSun, Snowflake, Sun, Undo2 } from "lucide-react";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { useMemo, useRef, useState } from "react";
import { Button, Glass } from "../components/Glass";
import { OutfitBoard } from "../components/OutfitBoard";
import { Sk, TodaySkeleton } from "../components/Skeleton";
import { ScreenHeader } from "../components/Strip";
import { toast } from "../components/Toast";
import { today, useUnwear, useWear, useWears, useWeather } from "../lib/api";
import { useDelayed, useWardrobe } from "../lib/hooks";
import { useNav } from "../lib/nav";
import { dailyOutfits, swapPiece } from "../shared/engine";
import type { Item, Weather } from "../shared/types";

function WeatherPill({ w }: { w: Weather | undefined }) {
  if (!w) return <Sk className="h-9 w-28 rounded-full" />;
  const Icon =
    w.code >= 71 && w.code <= 77 ? Snowflake : w.rain >= 50 ? CloudRain : w.code <= 1 ? Sun : CloudSun;
  return (
    <Glass className="flex items-center gap-2 rounded-full py-2 pl-3 pr-4 text-[13px]" data-testid="weather">
      <Icon size={17} />
      <span className="num font-semibold">{Math.round(w.tempMax)}°</span>
      <span className="num text-ink-2">{Math.round(w.tempMin)}°</span>
      {w.rain >= 30 && <span className="num text-ink-2">☂{Math.round(w.rain)}%</span>}
    </Glass>
  );
}

const DOW = ["日", "月", "火", "水", "木", "金", "土"];

export function TodayScreen() {
  const nav = useNav();
  const { usable, isLoading } = useWardrobe();
  const weather = useWeather();
  const wears = useWears();
  const wear = useWear();
  const unwear = useUnwear();
  const [index, setIndex] = useState(0);
  const [overrides, setOverrides] = useState<Record<number, Item[]>>({});
  const seen = useRef<Record<string, Set<string>>>({});

  const outfits = useMemo(() => {
    if (!weather.data) return [];
    return dailyOutfits(usable, {
      weather: weather.data,
      today: new Date(),
      recent: (wears.data ?? []).map((w) => ({ wornOn: w.wornOn, itemIds: w.itemIds })),
    });
  }, [usable, weather.data, wears.data]);

  const loading = isLoading || weather.isLoading || wears.isLoading;
  const showSk = useDelayed(loading);
  const todayLog = wears.data?.find((w) => w.wornOn === today());
  const d = new Date();
  const title = (
    <span>
      <span className="num">
        {d.getMonth() + 1}/{d.getDate()}
      </span>
      <span className="ml-1.5 text-[18px] text-ink-2">{DOW[d.getDay()]}</span>
    </span>
  );

  if (loading) return showSk ? <TodaySkeleton /> : null;

  if (!outfits.length) {
    return (
      <div>
        <ScreenHeader title={title} right={<WeatherPill w={weather.data} />} />
        <div className="flex flex-col items-center px-5 pt-[18vh]">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass mb-6 flex h-24 w-24 items-center justify-center rounded-[32px]"
          >
            <Camera size={36} strokeWidth={1.6} />
          </motion.div>
          <Button
            variant="ink"
            className="h-12 px-7 text-[15px]"
            onClick={() => nav.open({ type: "camera", mode: "register", onboarding: usable.length < 10 })}
          >
            撮る
          </Button>
        </div>
      </div>
    );
  }

  const i = Math.min(index, outfits.length - 1);
  const current = overrides[i] ?? outfits[i].pieces;
  const unworn = new Set(current.filter((p) => !p.wearCount).map((p) => p.id));

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60 || info.velocity.x < -400) setIndex((n) => Math.min(outfits.length - 1, n + 1));
    else if (info.offset.x > 60 || info.velocity.x > 400) setIndex((n) => Math.max(0, n - 1));
  };

  const swap = (slot: number) => {
    const key = `${i}:${slot}`;
    seen.current[key] ??= new Set();
    const next = swapPiece(current, slot, usable, seen.current[key]);
    if (next === current) {
      toast("入れ替えられる候補がありません");
      return;
    }
    setOverrides((o) => ({ ...o, [i]: next }));
  };

  const wearIt = () =>
    wear.mutate(
      { itemIds: current.map((p) => p.id), wornOn: today() },
      { onError: () => toast("記録できません") },
    );

  return (
    <div>
      <ScreenHeader title={title} right={<WeatherPill w={weather.data} />} />
      <div className="px-5">
        <div className="relative aspect-[4/5] w-full">
          <AnimatePresence initial={false}>
            {outfits.map((o, k) => {
              const offset = k - i;
              if (offset < 0 || offset > 2) return null;
              return (
                <motion.div
                  key={k}
                  className="glass absolute inset-0 rounded-[28px] p-3"
                  style={{ zIndex: 10 - offset }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: offset === 0 ? 1 : 0.6, scale: 1 - offset * 0.05, y: offset * 18 }}
                  exit={{ x: -360, opacity: 0, rotate: -8 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  drag={offset === 0 ? "x" : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.6}
                  onDragEnd={onDragEnd}
                  data-testid={offset === 0 ? "outfit-card" : undefined}
                >
                  {offset === 0 && (
                    <OutfitBoard pieces={overrides[k] ?? o.pieces} onPiece={swap} highlight={unworn} />
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        <div className="mt-5 flex justify-center gap-1.5">
          {outfits.map((_, k) => (
            <motion.button
              key={k}
              type="button"
              aria-label={`${k + 1}案目`}
              onClick={() => setIndex(k)}
              animate={{ width: k === i ? 22 : 7, opacity: k === i ? 1 : 0.35 }}
              transition={{ type: "spring", stiffness: 500, damping: 34 }}
              className="h-[7px] rounded-full bg-ink"
            />
          ))}
        </div>

        <div className="mt-5 flex justify-center">
          <AnimatePresence mode="wait">
            {todayLog ? (
              <motion.div
                key="worn"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="flex items-center gap-2"
              >
                <span className="flex h-12 items-center gap-2 rounded-full bg-buy px-6 text-[15px] font-semibold text-white">
                  <Check size={18} /> 記録済み
                </span>
                <Button className="h-12 w-12" onClick={() => unwear.mutate(todayLog)} aria-label="取り消す">
                  <Undo2 size={18} />
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="wear"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
              >
                <Button
                  variant="ink"
                  className="h-12 px-8 text-[15px]"
                  onClick={wearIt}
                  disabled={wear.isPending}
                  data-testid="wear"
                >
                  これを着る
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
