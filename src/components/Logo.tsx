/** ロゴ：ハンガーの形をしたガラスのしずく */
export function Logo({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" aria-hidden="true">
      <defs>
        <linearGradient id="logo-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1B1C22" />
          <stop offset="1" stopColor="#3A3D4A" />
        </linearGradient>
        <linearGradient id="logo-hl" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="white" stopOpacity="0.35" />
          <stop offset="0.5" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="88" height="88" rx="26" fill="url(#logo-bg)" />
      <rect x="4" y="4" width="88" height="88" rx="26" fill="url(#logo-hl)" />
      <path
        d="M48 30c0-4 3-6.5 6.5-6.5S61 26 61 29.5c0 3-2 4.6-4.4 6-2.6 1.5-8.6 5.2-8.6 5.2L20 58c-2.6 1.7-1.4 5.5 1.7 5.5h52.6c3.1 0 4.3-3.8 1.7-5.5L48 40.7"
        fill="none"
        stroke="white"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="72" cy="72" r="6" fill="#7FB2FF" />
    </svg>
  );
}
