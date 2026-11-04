import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect } from "react";
import { useReducedMotion } from "../lib/hooks";

/** 0 から数え上がり、決まったら軽く弾む数字 */
export function CountUp({
  value,
  prefix = "",
  className = "",
}: {
  value: number;
  prefix?: string;
  className?: string;
}) {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => `${prefix}${Math.round(v)}`);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) {
      mv.set(value);
      return;
    }
    const c = animate(mv, value, { duration: Math.min(1.1, 0.35 + value * 0.03), ease: [0.16, 1, 0.3, 1] });
    return () => c.stop();
  }, [value, mv, reduced]);
  return (
    <motion.span
      key={value}
      className={`num inline-block ${className}`}
      initial={{ scale: 1 }}
      animate={{ scale: [1, 1, 1.12, 1] }}
      transition={{
        duration: reduced ? 0 : Math.min(1.1, 0.35 + value * 0.03) + 0.3,
        times: [0, 0.7, 0.85, 1],
      }}
    >
      {text}
    </motion.span>
  );
}
