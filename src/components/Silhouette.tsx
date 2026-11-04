import { isNeutral } from "../shared/color";
import type { Category } from "../shared/types";

const PATHS: Record<string, string> = {
  // トップス
  top: "M35 12 L22 18 L8 34 L18 46 L26 38 L26 88 L74 88 L74 38 L82 46 L92 34 L78 18 L65 12 C62 20 56 24 50 24 C44 24 38 20 35 12 Z",
  knit: "M35 12 L20 18 L6 62 L18 66 L27 40 L26 88 L74 88 L73 40 L82 66 L94 62 L80 18 L65 12 C62 18 56 21 50 21 C44 21 38 18 35 12 Z",
  shirt:
    "M36 10 L22 16 L8 34 L18 46 L26 38 L26 90 L74 90 L74 38 L82 46 L92 34 L78 16 L64 10 L56 22 L50 16 L44 22 Z",
  // ボトムス
  bottom: "M28 10 L72 10 L76 90 L56 90 L50 36 L44 90 L24 90 Z",
  wide: "M30 10 L70 10 L82 90 L54 90 L50 40 L46 90 L18 90 Z",
  skirt: "M32 12 L68 12 L84 86 L16 86 Z",
  shorts: "M26 22 L74 22 L78 66 L56 66 L50 44 L44 66 L22 66 Z",
  // アウター
  outer:
    "M36 8 L20 14 L6 80 L20 82 L26 44 L26 92 L49 92 L49 30 L42 10 Z M64 8 L80 14 L94 80 L80 82 L74 44 L74 92 L51 92 L51 30 L58 10 Z",
  // ワンピース
  onepiece: "M38 8 L62 8 L64 30 L58 36 L80 90 L20 90 L42 36 L36 30 Z",
  // シューズ
  shoes: "M10 58 L14 40 L34 42 C40 48 52 52 70 54 C84 56 90 60 90 68 L90 72 L10 72 Z",
  boots: "M24 14 L46 14 L48 52 C60 56 76 58 84 62 C90 66 90 72 90 76 L18 76 L20 52 Z",
};

function pathFor(category: Category, sub?: string) {
  if (sub && PATHS[sub]) return PATHS[sub];
  if (sub === "shirt" || sub === "blouse" || sub === "polo") return PATHS.shirt;
  if (sub === "sweat" || sub === "hoodie" || sub === "longtee" || sub === "cardigan") return PATHS.knit;
  return PATHS[category];
}

/** 「買うと良い服」の見本図。実在の商品画像ではなく、形と色だけを示す */
export function Silhouette({
  category,
  subcategory,
  color,
  className = "",
}: {
  category: Category;
  subcategory?: string;
  color: string;
  className?: string;
}) {
  const light = isNeutral(color) && color > "#D0D0D0";
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`g-${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="white" stopOpacity="0.35" />
          <stop offset="0.5" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={pathFor(category, subcategory)}
        fill={color}
        stroke={light ? "rgb(11 11 15 / 0.18)" : "rgb(11 11 15 / 0.08)"}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d={pathFor(category, subcategory)} fill={`url(#g-${color.slice(1)})`} />
    </svg>
  );
}
