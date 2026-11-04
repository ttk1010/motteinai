import { type HTMLMotionProps, motion } from "motion/react";
import { forwardRef, type ReactNode } from "react";

/** Liquid Glass の屈折用 SVG フィルタ（Chromium のみ backdrop-filter で使われる） */
export function GlassFilters() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <filter id="lg-refract" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.012 0.018"
          numOctaves="2"
          seed="7"
          result="noise"
        />
        <feGaussianBlur in="noise" stdDeviation="2.4" result="soft" />
        <feDisplacementMap
          in="SourceGraphic"
          in2="soft"
          scale="22"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </svg>
  );
}

/** 白い背景の上でガラスが見えるよう、淡い色のにじみをゆっくり漂わせる */
export function Backdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div
        className="absolute -left-24 -top-20 h-[360px] w-[360px] rounded-full opacity-60 blur-[70px]"
        style={{ background: "#CFE3FF", animation: "drift-a 20s ease-in-out infinite" }}
      />
      <div
        className="absolute -right-28 top-[38%] h-[320px] w-[320px] rounded-full opacity-55 blur-[70px]"
        style={{ background: "#FFE1EC", animation: "drift-b 24s ease-in-out infinite" }}
      />
      <div
        className="absolute -bottom-24 left-[10%] h-[300px] w-[300px] rounded-full opacity-50 blur-[80px]"
        style={{ background: "#E3F6EC", animation: "drift-c 22s ease-in-out infinite" }}
      />
    </div>
  );
}

type GlassProps = HTMLMotionProps<"div"> & { strong?: boolean; refract?: boolean };

export const Glass = forwardRef<HTMLDivElement, GlassProps>(function Glass(
  { className = "", strong, refract, ...rest },
  ref,
) {
  return (
    <motion.div
      ref={ref}
      className={`glass ${strong ? "glass-strong" : ""} ${refract ? "glass-refract" : ""} ${className}`}
      {...rest}
    />
  );
});

type ButtonProps = HTMLMotionProps<"button"> & { variant?: "glass" | "ink" | "plain"; children?: ReactNode };

export function Button({ variant = "glass", className = "", ...rest }: ButtonProps) {
  const styles = {
    glass: "glass text-ink",
    ink: "bg-ink text-white shadow-[0_8px_24px_rgb(11_11_15/0.25)]",
    plain: "text-ink",
  }[variant];
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-medium disabled:opacity-40 ${styles} ${className}`}
      {...rest}
    />
  );
}

export function Chip({
  active,
  children,
  onClick,
  className = "",
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      animate={{ scale: active ? 1.04 : 1 }}
      transition={{ type: "spring", stiffness: 600, damping: 28 }}
      className={`relative shrink-0 rounded-full px-3.5 py-1.5 text-[13px] ${
        active ? "bg-ink text-white" : "glass text-ink"
      } ${className}`}
    >
      {children}
    </motion.button>
  );
}
