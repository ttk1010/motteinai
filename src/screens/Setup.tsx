import { Check, MapPin } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { Button, Chip, Glass } from "../components/Glass";
import { Logo } from "../components/Logo";
import { useMe, useUpdateMe } from "../lib/api";
import { useNav } from "../lib/nav";
import type { Gender } from "../shared/types";
import { GENDER_LABEL, useLocate } from "./Me";

/** 初回だけ。服の傾向と天気の地域（任意） */
export function SetupScreen() {
  const me = useMe();
  const update = useUpdateMe();
  const nav = useNav();
  const { locate, busy } = useLocate();
  const [gender, setGender] = useState<Gender | null>(null);

  const start = () => {
    if (!gender) return;
    update.mutate({ gender });
    nav.open({ type: "camera", mode: "register", onboarding: true });
  };

  return (
    <div className="flex min-h-dvh flex-col px-6" style={{ paddingTop: "calc(var(--safe-top) + 48px)" }}>
      <Logo size={48} />
      <Glass
        className="mt-10 rounded-[28px] p-5"
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 26 }}
      >
        <div className="text-[12px] font-medium text-ink-2">服の傾向</div>
        <div className="mt-2.5 flex gap-2">
          {(Object.keys(GENDER_LABEL) as Gender[]).map((g) => (
            <Chip
              key={g}
              active={gender === g}
              onClick={() => setGender(g)}
              className="!px-5 !py-2.5 !text-[14px]"
            >
              {GENDER_LABEL[g]}
            </Chip>
          ))}
        </div>
        <div className="my-5 h-px bg-ink/5" />
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[12px] font-medium text-ink-2">天気の地域</div>
            <div className="text-[14px]">{me.data?.place ?? "東京"}</div>
          </div>
          <Button className="h-10 px-4 text-[13px]" onClick={locate} disabled={busy}>
            {me.data?.place ? <Check size={15} /> : <MapPin size={15} />} 現在地
          </Button>
        </div>
      </Glass>
      <motion.div
        className="mt-auto pb-[calc(var(--safe-bottom)+28px)]"
        animate={{ opacity: gender ? 1 : 0.5 }}
      >
        <Button
          variant="ink"
          className="h-14 w-full text-[16px]"
          disabled={!gender}
          onClick={start}
          data-testid="setup-start"
        >
          撮りはじめる
        </Button>
      </motion.div>
    </div>
  );
}
