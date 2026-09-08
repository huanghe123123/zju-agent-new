import { useMemo } from "react";
import { type TimetableEntry, mergeTimetableEntries } from "@zju-agent/core";

const DAY_LABELS = ["", "周一", "周二", "周三", "周四", "周五", "周六", "周日"] as const;
const MAX_SECTION = 13;
const DAYS = [1, 2, 3, 4, 5, 6, 7] as const;

const COURSE_COLORS = [
  "bg-blue-50 border-blue-200 text-blue-800",
  "bg-pink-50 border-pink-200 text-pink-800",
  "bg-emerald-50 border-emerald-200 text-emerald-800",
  "bg-amber-50 border-amber-200 text-amber-800",
  "bg-purple-50 border-purple-200 text-purple-800",
  "bg-rose-50 border-rose-200 text-rose-800",
  "bg-cyan-50 border-cyan-200 text-cyan-800",
  "bg-indigo-50 border-indigo-200 text-indigo-800",
];

type CourseGroup = {
  weekday: number;
  startSection: number;
  /** 组内最大跨节数（同格多门课时容器按最高课拉伸） */
  span: number;
  items: TimetableEntry[];
};

export function TimetableGrid({ entries: rawEntries }: { entries: TimetableEntry[] }) {
  const entries = useMemo(() => mergeTimetableEntries(rawEntries), [rawEntries]);
  const courseNames = useMemo(
    () => [...new Set(entries.map((e) => e.courseName))],
    [entries],
  );
  const colorOf = (name: string) =>
    COURSE_COLORS[courseNames.indexOf(name) % COURSE_COLORS.length]!;

  // 按起始格分组：同天同起始节的多门课在容器内并排渲染
  const groups = useMemo(() => {
    const map = new Map<string, CourseGroup>();
    for (const e of entries) {
      const key = `${e.weekday}-${e.startSection}`;
      const g =
        map.get(key) ??
        { weekday: e.weekday, startSection: e.startSection, span: 0, items: [] };
      g.items.push(e);
      g.span = Math.max(g.span, e.endSection - e.startSection + 1);
      map.set(key, g);
    }
    return [...map.values()];
  }, [entries]);

  return (
    <div className="overflow-auto rounded-lg border border-slate-200">
      {/*
        CSS Grid 显式定位：每个格子用 gridColumn/gridRow 精确放置，
        课程块通过 gridRow span 跨行，行高变化时块随网格线自然伸缩，
        不存在绝对定位手算高度导致的漂移。
        格子只画下边框+右边框，相邻线不重叠。
      */}
      <div
        className="grid"
        style={{
          minWidth: 750,
          gridTemplateColumns: "48px repeat(7, minmax(0, 1fr))",
          gridTemplateRows: `32px repeat(${MAX_SECTION}, minmax(48px, auto))`,
        }}
      >
        {/* 表头（sticky 随横向滚动条吸顶） */}
        <div
          className="sticky top-0 z-20 flex items-center justify-center border-b border-r border-slate-200 bg-slate-50 p-1.5 text-[11px] font-medium text-slate-500"
          style={{ gridColumn: 1, gridRow: 1 }}
        >
          节次
        </div>
        {DAYS.map((d) => (
          <div
            key={`h-${d}`}
            className="sticky top-0 z-20 flex items-center justify-center border-b border-r border-slate-200 bg-slate-50 p-1.5 text-[11px] font-medium text-slate-500"
            style={{ gridColumn: d + 1, gridRow: 1 }}
          >
            {DAY_LABELS[d]}
          </div>
        ))}

        {/* 节次编号列 */}
        {Array.from({ length: MAX_SECTION }, (_, i) => i + 1).map((sec) => (
          <div
            key={`sec-${sec}`}
            className="flex items-center justify-center border-b border-r border-slate-100 bg-slate-50/50 text-[10px] text-slate-400"
            style={{ gridColumn: 1, gridRow: sec + 1 }}
          >
            {sec}
          </div>
        ))}

        {/* 空白日格（负责画网格线） */}
        {DAYS.map((d) =>
          Array.from({ length: MAX_SECTION }, (_, i) => i + 1).map((sec) => (
            <div
              key={`cell-${d}-${sec}`}
              className="border-b border-r border-slate-100"
              style={{ gridColumn: d + 1, gridRow: sec + 1 }}
            />
          )),
        )}

        {/* 课程块：放在起始格，跨 span 行，随行高伸缩 */}
        {groups.map((g) => (
          <div
            key={`g-${g.weekday}-${g.startSection}`}
            className="z-10 flex min-w-0 gap-0.5 p-0.5"
            style={{
              gridColumn: g.weekday + 1,
              gridRow: `${g.startSection + 1} / span ${g.span}`,
            }}
          >
            {g.items.map((e) => (
              <div
                key={e.id}
                className={`min-w-0 flex-1 overflow-hidden rounded border p-1.5 text-xs shadow-sm ${colorOf(e.courseName)}`}
              >
                <div className="truncate font-medium">{e.courseName}</div>
                {e.teacher && (
                  <div className="truncate text-[10px] opacity-70">{e.teacher}</div>
                )}
                {e.location && (
                  <div className="truncate text-[10px] opacity-70">{e.location}</div>
                )}
                {e.weeks.length > 0 && (
                  <div className="mt-0.5 text-[10px] opacity-50">
                    {compressWeeks(e.weeks)} 周
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function compressWeeks(weeks: number[]): string {
  if (weeks.length === 0) return "";
  const sorted = [...new Set(weeks)].sort((a, b) => a - b);
  const parts: string[] = [];
  let start = sorted[0]!;
  let prev = sorted[0]!;
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i]!;
    if (cur !== prev + 1) {
      parts.push(start === prev ? `${start}` : `${start}-${prev}`);
      start = cur;
    }
    prev = cur;
  }
  parts.push(start === prev ? `${start}` : `${start}-${prev}`);
  return parts.join(",");
}
