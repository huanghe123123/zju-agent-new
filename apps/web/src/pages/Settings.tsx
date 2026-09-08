import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout.js";
import { useApiFetch } from "../api/bootstrap.js";
import { useValidateCredential, useLogout } from "../api/auth.js";
import {
  fileToAvatarDataUrl,
  useAppSettings,
  useSaveAppSettings,
} from "../api/settings.js";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faRobot,
  faLock,
  faShieldHalved,
  faTrashCan,
  faClipboardList,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

export function SettingsPage() {
  const apiFetch = useApiFetch();
  const navigate = useNavigate();
  const validate = useValidateCredential();
  const logout = useLogout();
  const [modelOpen, setModelOpen] = useState(false);

  useEffect(() => {
    if (window.location.hash === "#providers") {
      setModelOpen(true);
      setTimeout(() => {
        document.getElementById("providers")?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    } else if (window.location.hash === "#zju") {
      setTimeout(() => {
        document.getElementById("zju")?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    }
  }, []);
  const [model, setModel] = useState({
    id: crypto.randomUUID(),
    name: "默认模型",
    protocol: "openai" as "openai" | "anthropic",
    baseUrl: "https://api.openai.com/v1",
    apiKey: "",
    model: "gpt-4o-mini",
    enabled: true,
  });
  const [message, setMessage] = useState<string | null>(null);

  // 个性化：昵称 / 头像 / 默认提示词
  const { data: appSettings } = useAppSettings();
  const saveApp = useSaveAppSettings();
  const [nickname, setNickname] = useState("");
  const [persona, setPersona] = useState("");
  const [avatar, setAvatar] = useState<string | undefined>(undefined);
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    if (profileLoaded || !appSettings) return;
    setNickname(typeof appSettings.nickname === "string" ? appSettings.nickname : "");
    setPersona(
      typeof appSettings.personaPrompt === "string" ? appSettings.personaPrompt : "",
    );
    setAvatar(
      typeof appSettings.avatarDataUrl === "string" ? appSettings.avatarDataUrl : undefined,
    );
    setProfileLoaded(true);
  }, [appSettings, profileLoaded]);

  async function onPickAvatar(file: File) {
    setMessage(null);
    try {
      setAvatar(await fileToAvatarDataUrl(file));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "图片处理失败");
    }
  }

  async function saveProfile() {
    setMessage(null);
    try {
      // PUT /api/settings/app 是整体覆盖，必须带上已有字段
      await saveApp.mutateAsync({
        ...(appSettings ?? {}),
        nickname: nickname.trim(),
        personaPrompt: persona.trim(),
        avatarDataUrl: avatar,
      });
      setMessage("个性化设置已保存");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "保存失败");
    }
  }

  function reload() {
    window.location.reload();
  }

  async function saveModel() {
    const res = await apiFetch("/api/settings/model-providers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(model),
    });
    if (!res.ok) {
      setMessage("保存模型配置失败");
      return;
    }
    setModelOpen(false);
    setMessage("模型配置已保存");
    reload();
  }

  async function revalidate() {
    setMessage(null);
    try {
      const status = await validate.mutateAsync(undefined);
      setMessage(status.ok ? "ZJU 登录验证成功" : `验证失败：${status.message ?? ""}`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "验证失败");
    }
  }

  async function doLogout() {
    await logout.mutateAsync();
    setMessage("已登出，凭据已清除");
    reload();
  }

  return (
    <Layout>
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold text-zju-primary">设置</h1>

        {message && (
          <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
            {message}
          </div>
        )}

        {/* 模型 Provider */}
        <Section id="providers" title="模型 Provider" icon={faRobot}>
          <button
            onClick={() => setModelOpen((v) => !v)}
            className="rounded-md bg-zju-primary px-3 py-1.5 text-sm text-white hover:bg-zju-light"
          >
            {modelOpen ? "收起" : "新增 / 更新模型"}
          </button>
          {modelOpen && (
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
              <Field label="名称">
                <input className="input" value={model.name} onChange={(e) => setModel({ ...model, name: e.target.value })} />
              </Field>
              <Field label="协议">
                <select className="input" value={model.protocol} onChange={(e) => setModel({ ...model, protocol: e.target.value as "openai" | "anthropic" })}>
                  <option value="openai">OpenAI 兼容</option>
                  <option value="anthropic">Anthropic 兼容</option>
                </select>
              </Field>
              <Field label="Base URL">
                <input className="input" value={model.baseUrl} onChange={(e) => setModel({ ...model, baseUrl: e.target.value })} />
              </Field>
              <Field label="API Key">
                <input autoComplete="off" className="input" type="password" value={model.apiKey} onChange={(e) => setModel({ ...model, apiKey: e.target.value })} />
              </Field>
              <Field label="模型">
                <input className="input" value={model.model} onChange={(e) => setModel({ ...model, model: e.target.value })} />
              </Field>
              <div className="flex items-end">
                <button onClick={saveModel} className="rounded-md bg-zju-primary px-4 py-2 text-sm text-white hover:bg-zju-light">
                  保存
                </button>
              </div>
            </div>
          )}
          <p className="mt-2 text-xs text-slate-400">
            API Key 仅保存在本机加密存储，不会出现在任何接口响应中。
          </p>
        </Section>

        {/* ZJU 账号 */}
        <Section id="zju" title="ZJU 统一身份认证" icon={faLock}>
          <div className="flex flex-wrap gap-2">
            <button onClick={revalidate} disabled={validate.isPending} className="rounded-md bg-zju-primary px-3 py-1.5 text-sm text-white hover:bg-zju-light disabled:opacity-50">
              {validate.isPending ? "验证中…" : "重新验证登录"}
            </button>
            <button onClick={() => navigate("/setup")} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
              修改账号
            </button>
            <button onClick={doLogout} disabled={logout.isPending} className="rounded-md border border-rose-300 px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50 disabled:opacity-50">
              {logout.isPending ? "登出中…" : "登出并清除凭据"}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            登出将清除本机保存的 ZJU 密码与所有校园服务 session。
          </p>
        </Section>

        {/* 个性化 */}
        <Section id="profile" title="个性化" icon={faUser}>
          <div className="flex items-start gap-4">
            <div className="flex w-20 shrink-0 flex-col items-center gap-2">
              {avatar ? (
                <img
                  src={avatar}
                  alt="头像"
                  className="size-16 rounded-full object-cover ring-2 ring-slate-200"
                />
              ) : (
                <div className="flex size-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <FontAwesomeIcon icon={faUser} className="text-xl" />
                </div>
              )}
              <label className="cursor-pointer rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100">
                选择图片
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void onPickAvatar(file);
                    e.target.value = "";
                  }}
                />
              </label>
              {avatar && (
                <button
                  onClick={() => setAvatar(undefined)}
                  className="text-xs text-rose-600 hover:underline"
                >
                  移除头像
                </button>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <Field label="昵称（主页问候语，AI 也会这样称呼你）">
                <input
                  className="input"
                  maxLength={24}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="例如：小林"
                />
              </Field>
              <Field label="默认提示词（注入所有 AI 对话，让回答更贴合你）">
                <textarea
                  className="input"
                  rows={4}
                  maxLength={1000}
                  value={persona}
                  onChange={(e) => setPersona(e.target.value)}
                  placeholder="例如：我是浙江大学计算机学院大二学生，爱好摄影和跑步，平时喜欢研究操作系统与分布式系统；回答时多结合课程与校园生活。"
                />
              </Field>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={saveProfile}
                  disabled={saveApp.isPending}
                  className="rounded-md bg-zju-primary px-4 py-2 text-sm text-white hover:bg-zju-light disabled:opacity-50"
                >
                  {saveApp.isPending ? "保存中…" : "保存个性化设置"}
                </button>
                <span className="text-xs text-slate-400">
                  头像压缩到 256px 后仅存本机，不会上传
                </span>
              </div>
            </div>
          </div>
        </Section>

        {/* 权限策略 */}
        <Section title="权限策略" icon={faShieldHalved}>
          <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
            <p className="font-medium mb-1">当前策略（默认）</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>查询类工具（课程/作业/考试）→ 直接执行</li>
              <li>下载单个资料 → 可直接执行</li>
              <li>批量下载 → 必须确认</li>
              <li>作业提交 → 必须确认</li>
              <li>校网充值 → 必须确认</li>
            </ul>
          </div>
          <p className="mt-2 text-xs text-slate-400">高风险操作必须经过用户确认，防止 Agent 静默执行。</p>
        </Section>

        {/* 清除数据 */}
        <Section title="数据管理" icon={faTrashCan}>
          <div className="flex flex-wrap gap-2">
            <button className="rounded-md border border-rose-300 px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50">
              清除本地缓存
            </button>
            <button className="rounded-md border border-rose-300 px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50">
              清除会话历史
            </button>
            <button onClick={doLogout} className="rounded-md border border-rose-300 px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50">
              清除所有凭据
            </button>
          </div>
        </Section>

        {/* 导出日志 */}
        <Section title="导出日志" icon={faClipboardList}>
          <button className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
            导出审计日志
          </button>
          <p className="mt-2 text-xs text-slate-400">导出本地操作记录，不包含密码和 API Key。</p>
        </Section>
      </div>

      <style>{`
        .input { width: 100%; border-radius: 0.375rem; border: 1px solid rgb(203 213 225); padding: 0.5rem 0.75rem; font-size: 0.875rem; }
        .input:focus { border-color: #003f88; outline: none; }
      `}</style>
    </Layout>
  );
}

function Section({ id, title, icon, children }: { id?: string; title: string; icon?: IconDefinition; children: React.ReactNode }) {
  return (
    <div id={id} className="rounded-lg border border-slate-200 bg-white p-4 scroll-mt-6">
      <h2 className="mb-3 font-semibold text-slate-800 flex items-center gap-2">
        {icon && <FontAwesomeIcon icon={icon} className="text-slate-500 text-sm" />}
        {title}
      </h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-sm text-slate-600">{label}</span>
      {children}
    </label>
  );
}
