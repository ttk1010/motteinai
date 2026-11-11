import { motion } from "motion/react";
import { Button } from "../components/Glass";
import { Logo } from "../components/Logo";
import { useAuthConfig } from "../lib/api";

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}

export function LoginScreen() {
  const cfg = useAuthConfig();
  const failed = new URLSearchParams(location.search).get("login") === "failed";
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-8">
      <motion.div
        initial={{ scale: 0.7, opacity: 0, rotate: -8 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 18 }}
      >
        <Logo size={88} />
      </motion.div>
      <motion.h1
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.12 }}
        className="mt-5 text-[28px] font-bold tracking-tight"
      >
        Motteinai
      </motion.h1>
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.22, type: "spring", stiffness: 260, damping: 24 }}
        className="mt-14 w-full max-w-xs space-y-3"
      >
        <Button
          className="glass-strong h-14 w-full text-[15px]"
          onClick={() => {
            location.href = "/auth/google";
          }}
          data-testid="google-login"
        >
          <GoogleMark /> Googleで続ける
        </Button>
        {cfg.data?.dev && (
          <Button
            variant="plain"
            className="h-11 w-full text-[13px] text-ink-2"
            onClick={() => {
              location.href = "/auth/dev";
            }}
            data-testid="dev-login"
          >
            開発用ログイン
          </Button>
        )}
        {failed && <div className="text-center text-[13px] text-skip">ログインできませんでした</div>}
      </motion.div>
    </div>
  );
}
