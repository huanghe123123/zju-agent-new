import { useMemo } from "react";
import { type TimetableEntry, mergeTimetableEntries } from "@zju-agent/core";
import {
  compressWeeks,
  courseNamesOf,
  groupTimetable,
  periodTimeRange,
  COURSE_COLORS,
  DAY_LABELS,
  DAYS,
  MAX_SECTION,
} from "../utils/timetable.js";

export function TimetableGrid({ entries: rawEntries }: { entries: TimetableEntry[] }) {
  const entries = useMemo(() => mergeTimetableEntries(rawEntries), [rawEntries]);
  const courseNames = useMemo(() => courseNamesOf(entries), [entries]);
  const colorOf = (name: string) =>
    COURSE_COLORS[courseNames.indexOf(name) % COURSE_COLORS.length]!;

  const groups = useMemo(() => groupTimetable(entries), [entries]);

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
          minWidth: 766,
          gridTemplateColumns: "64px repeat(7, minmax(0, 1fr))",
          gridTemplateRows: `32px repeat(${MAX_SECTION}, minmax(48px, auto))`,
        }}
      >
        {/* 表头（sticky 随横向滚动条吸顶） */}
        <div
          className="sticky top-0 z-20 flex flex-col items-center justify-center border-b border-r border-slate-200 bg-slate-50 p-1.5 text-[11px] font-medium leading-tight text-slate-500"
          style={{ gridColumn: 1, gridRow: 1 }}
        >
          <span>节次</span>
          <span className="text-[9px] font-normal text-slate-400">上课时间</span>
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

        {/* 节次编号列：节次 + 上课时间（时间来自 core 的浙大标准作息表） */}
        {Array.from({ length: MAX_SECTION }, (_, i) => i + 1).map((sec) => (
          <div
            key={`sec-${sec}`}
            className="flex flex-col items-center justify-center gap-0.5 border-b border-r border-slate-100 bg-slate-50/50 px-0.5"
            style={{ gridColumn: 1, gridRow: sec + 1 }}
          >
            <span className="text-[11px] font-medium leading-none text-slate-500">{sec}</span>
            <span className="text-[9px] leading-none text-slate-400">
              {periodTimeRange(sec)}
            </span>
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
