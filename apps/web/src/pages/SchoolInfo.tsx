/**
 * 学校信息页：素质拓展平台 + 教务系统·通知公告。
 * 两个均为免登录公开源，由本地后端抓取并缓存；点击条目用系统浏览器打开原文。
 */

import { useMemo, useState } from "react";
import { Layout } from "../components/Layout.js";
import { ErrorState } from "../components/ErrorState.js";
import { Loading } from "../components/Loading.js";
import { useNotices } from "../api/zju.js";
import type { Notice, NoticeSource } from "@zju-agent/core";
import { Segmented } from "@crisp-ui-kit/crisp";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faRotate,
  faTriangleExclamation,
  faUpRightFromSquare,
} from "@fortawesome/free-solid-svg-icons";

type SourceFilter = "all" | NoticeSource;

const SOURCE_FILTERS: { value: SourceFilter; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "sztz", label: "素质拓展" },
  { value: "zdbk", label: "教务系统" },
];

/** 来源徽标配色：素拓绿 / 教务红（对齐源站观感） */
const SOURCE_BADGE: Record<NoticeSource, string> = {
  sztz: "bg-emerald-50 text-emerald-700 border-emerald-200",
  zdbk: "bg-rose-50 text-rose-700 border-rose-200",
};

export function SchoolInfoPage() {
  const [source, setSource] = useState<SourceFilter>("all");
  const [refreshSeq, setRefreshSeq] = useState(0);
  const { data, isLoading, error, isFetching } = useNotices(20, refreshSeq);

  const failures = data?.failures ?? [];
  const filtered = useMemo(() => {
    const items = data?.items ?? [];
    return source === "all" ? items : items.filter((n) => n.source === source);
  }, [data, source]);

  return (
    <Layout>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-zju-primary">学校信息</h1>
        <p className="mt-0.5 text-xs text-slate-400">
          素质拓展平台与教务系统的最新通知公告，点击条目在浏览器打开原文
        </p>
      </div>

      <div className="mb-3 flex items-center justify-between gap-3">
        <Segmented
          value={source}
          onValueChange={(val) => setSource(val as SourceFilter)}
          options={SOURCE_FILTERS.map((f) => ({
            value: f.value,
            label: (
              <span className="inline-flex items-center px-1 text-xs font-semibold">
                {f.label}
              </span>
            ),
          }))}
        />
        <button
          onClick={() => setRefreshSeq((v) => v + 1)}
          disabled={isFetching}
          className="text-sm text-slate-500 hover:text-zju-primary disabled:opacity-50"
        >
          <FontAwesomeIcon
            icon={faRotate}
            className={`mr-1 text-xs ${isFetching ? "animate-spin" : ""}`}
          />
          {isFetching ? "刷新中…" : "刷新"}
        </button>
      </div>

      {failures.length > 0 && (
        <div className="mb-3 flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          <FontAwesomeIcon icon={faTriangleExclamation} className="mt-0.5 shrink-0" />
          <span>{failures.join("；")}</span>
        </div>
      )}

      {error ? (
        <ErrorState
          message={error.message}
          hint="通知源可能暂时不可用，请稍后刷新重试。"
        />
      ) : isLoading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          暂无通知
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((n) => (
            <NoticeRow key={n.id} notice={n} />
          ))}
        </ul>
      )}
    </Layout>
  );
}

function NoticeRow({ notice }: { notice: Notice }) {
  const open = () => window.open(notice.url, "_blank", "noopener");
  return (
    <li>
      <button
        onClick={open}
        className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-3 text-left transition hover:border-zju-primary/60 hover:shadow-sm"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              {notice.important && (
                <span className="shrink-0 rounded bg-rose-500 px-1 py-0.5 text-[10px] font-semibold text-white">
                  置顶
                </span>
              )}
              <span
                className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium ${SOURCE_BADGE[notice.source]}`}
              >
                {notice.sourceName}
              </span>
              <span className="truncate text-sm font-medium text-slate-800">
                {notice.title}
              </span>
            </div>
            {notice.summary && (
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                {notice.summary}
              </p>
            )}
            <div className="mt-1.5 flex items-center gap-2.5 text-[11px] text-slate-400">
              {notice.date && <span>{notice.date}</span>}
              {notice.publisher && <span>{notice.publisher}</span>}
            </div>
          </div>
          <FontAwesomeIcon
            icon={faUpRightFromSquare}
            className="mt-1 shrink-0 text-xs text-slate-300"
          />
        </div>
      </button>
    </li>
  );
}
