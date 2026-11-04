import { colorName } from "../shared/color";
import {
  CATEGORIES,
  CATEGORY_LABEL,
  FIT_LABEL,
  FITS,
  type Gender,
  type ItemTags,
  PATTERN_LABEL,
  PATTERNS,
  SEASON_LABEL,
  SEASONS,
  subsFor,
} from "../shared/types";
import { Chip } from "./Glass";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-2">
      <div className="mb-1.5 px-5 text-[11px] font-medium text-ink-2">{label}</div>
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-5">{children}</div>
    </div>
  );
}

function Scale({
  value,
  onChange,
  labels,
}: {
  value: number;
  onChange: (v: number) => void;
  labels: [string, string];
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-ink-2">{labels[0]}</span>
      {[1, 2, 3, 4, 5].map((n) => (
        <Chip key={n} active={value === n} onClick={() => onChange(n)} className="!px-0 w-9 num">
          {n}
        </Chip>
      ))}
      <span className="text-[11px] text-ink-2">{labels[1]}</span>
    </div>
  );
}

/** タグの修正。候補の札を押すだけで直る */
export function TagEditor({
  tags,
  onChange,
  gender,
  only,
}: {
  tags: ItemTags;
  onChange: (t: ItemTags) => void;
  gender: Gender | null;
  only?: ("category" | "subcategory")[];
}) {
  const set = <K extends keyof ItemTags>(k: K, v: ItemTags[K]) => onChange({ ...tags, [k]: v });
  const show = (k: string) => !only || only.includes(k as "category");
  return (
    <div>
      {show("category") && (
        <Row label="カテゴリ">
          {CATEGORIES.map((c) => (
            <Chip
              key={c}
              active={tags.category === c}
              onClick={() => onChange({ ...tags, category: c, subcategory: subsFor(c, gender)[0].id })}
            >
              {CATEGORY_LABEL[c]}
            </Chip>
          ))}
        </Row>
      )}
      {show("subcategory") && (
        <Row label="種類">
          {subsFor(tags.category, gender).map((s) => (
            <Chip key={s.id} active={tags.subcategory === s.id} onClick={() => set("subcategory", s.id)}>
              {s.label}
            </Chip>
          ))}
        </Row>
      )}
      {!only && (
        <>
          <Row label="色">
            <label className="glass relative flex shrink-0 items-center gap-2 rounded-full py-1 pl-1 pr-3.5 text-[13px]">
              <span
                className="h-6 w-6 rounded-full border border-black/10"
                style={{ background: tags.color }}
              />
              {colorName(tags.color)}
              <input
                type="color"
                value={tags.color.toLowerCase()}
                onChange={(e) => set("color", e.target.value.toUpperCase())}
                className="absolute inset-0 opacity-0"
                aria-label="色"
              />
            </label>
          </Row>
          <Row label="柄">
            {PATTERNS.map((p) => (
              <Chip key={p} active={tags.pattern === p} onClick={() => set("pattern", p)}>
                {PATTERN_LABEL[p]}
              </Chip>
            ))}
          </Row>
          <Row label="シルエット">
            {FITS.map((f) => (
              <Chip key={f} active={tags.fit === f} onClick={() => set("fit", f)}>
                {FIT_LABEL[f]}
              </Chip>
            ))}
          </Row>
          <Row label="きちんと度">
            <Scale
              value={tags.formality}
              onChange={(v) => set("formality", v)}
              labels={["ラフ", "きちんと"]}
            />
          </Row>
          <Row label="暖かさ">
            <Scale value={tags.warmth} onChange={(v) => set("warmth", v)} labels={["薄手", "厚手"]} />
          </Row>
          <Row label="季節">
            {SEASONS.map((s) => {
              const on = tags.seasons.includes(s);
              return (
                <Chip
                  key={s}
                  active={on}
                  onClick={() =>
                    set(
                      "seasons",
                      on
                        ? tags.seasons.length > 1
                          ? tags.seasons.filter((x) => x !== s)
                          : tags.seasons
                        : [...tags.seasons, s],
                    )
                  }
                >
                  {SEASON_LABEL[s]}
                </Chip>
              );
            })}
          </Row>
        </>
      )}
    </div>
  );
}

export function tagsOf(i: ItemTags): ItemTags {
  return {
    category: i.category,
    subcategory: i.subcategory,
    color: i.color,
    pattern: i.pattern,
    fit: i.fit,
    formality: i.formality,
    warmth: i.warmth,
    seasons: i.seasons,
  };
}
