/**
 * 课表网格共享逻辑：TimetableGrid（网页渲染）与 exportTimetable（PNG/Excel 导出）
 * 共用同一套摆放与配色规则，保证导出与页面所见一致。
 */

import type { TimetableEntry } from "@zju-agent/core";

export const DAY_LABELS = ["", "周一", "周二", "周三", "周四", "周五", "周六", "周日"] as const;
export const MAX_SECTION = 13;
export const DAYS = [1, 2, 3, 4, 5, 6, 7] as const;

/** 网页端课程块配色（Tailwind v3 刻度），按课程名首次出现顺序循环取色 */
export const COURSE_COLORS = [
  "bg-blue-50 border-blue-200 text-blue-800",
  "bg-pink-50 border-pink-200 text-pink-800",
  "bg-emerald-50 border-emerald-200 text-emerald-800",
  "bg-amber-50 border-amber-200 text-amber-800",
  "bg-purple-50 border-purple-200 text-purple-800",
  "bg-rose-50 border-rose-200 text-rose-800",
  "bg-cyan-50 border-cyan-200 text-cyan-800",
  "bg-indigo-50 border-indigo-200 text-indigo-800",
] as const;

/** Excel 导出配色：与 COURSE_COLORS 一一对应（Tailwind v3 调色板 hex，ARGB 加 FF 前缀） */
export const COURSE_COLOR_HEX = [
  { bg: "FFEFF6FF", border: "FFBFDBFE", text: "FF1E40AF" }, // blue
  { bg: "FFFDF2F8", border: "FFFBCFE8", text: "FF9D174D" }, // pink
  { bg: "FFECFDF5", border: "FFA7F3D0", text: "FF065F46" }, // emerald
  { bg: "FFFFFBEB", border: "FFFDE68A", text: "FF92400E" }, // amber
  { bg: "FFF5F3FF", border: "FFDDD6FE", text: "FF6D28D9" }, // purple
  { bg: "FFFFF1F2", border: "FFFECDD3", text: "FF9F1239" }, // rose
  { bg: "FFECFEFF", border: "FFA5F3FC", text: "FF155E75" }, // cyan
  { bg: "FFEEF2FF", border: "FFC7D2FE", text: "FF3730A3" }, // indigo
] as const;

export type CourseGroup = {
  weekday: number;
  startSection: number;
  /** 组内最大跨节数（同格多门课时容器按最高课拉伸） */
  span: number;
  items: TimetableEntry[];
};

/** 按起始格分组：同天同起始节的多门课并排渲染 */
export function groupTimetable(entries: TimetableEntry[]): CourseGroup[] {
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
}

/** 课程名列表（首次出现顺序），供取色循环 */
export function courseNamesOf(entries: TimetableEntry[]): string[] {
  return [...new Set(entries.map((e) => e.courseName))];
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

/** 教务网学期 id → 显示名，如 "2026-2027-1" → "2026-2027学年秋冬学期" */
export function semesterDisplayName(xnxq01id: string): string {
  const year = xnxq01id.slice(0, 9);
  if (xnxq01id.endsWith("-2")) return `${year}学年春夏学期`;
  if (xnxq01id.endsWith("-3")) return `${year}学年短学期`;
  return `${year}学年秋冬学期`;
}
