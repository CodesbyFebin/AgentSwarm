"use client";

import { useState } from "react";
import { Copy, FileJson, Plus, Trash2, Upload, Wand2 } from "lucide-react";
import { AgentCardZod } from "@/types/swarm";
import type { AgentCard, AgentCardForm } from "@/types/swarm";

interface ManifestEditorProps {
  onRegistered: (agent: AgentCard) => void;
}

const EMPTY_SKILL = {
  name: "",
  description: "",
  requiresApproval: false,
  riskThreshold: "LOW" as const,
  input_schema: {},
};

const EMPTY_FORM: AgentCardForm = {
  id: "",
  name: "",
  version: "1.0.0",
  endpoint: "/api/swarm/execute",
  did: "did:swarm:in:",
  developer: "",
  pricing: { currency: "USDC", base_task_fee: 0.01 },
  skills: [{ ...EMPTY_SKILL }],
};

type IssueMap = Record<string, string>;

export default function ManifestEditor({ onRegistered }: ManifestEditorProps) {
  const [form, setForm] = useState<AgentCardForm>(EMPTY_FORM);
  const [issues, setIssues] = useState<IssueMap>({});
  const [manifest, setManifest] = useState<Record<string, unknown> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const update = (patch: Partial<AgentCardForm>) => setForm((f) => ({ ...f, ...patch }));

  const updateSkill = (i: number, patch: Partial<AgentCardForm["skills"][number]>) =>
    setForm((f) => ({
      ...f,
      skills: f.skills.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    }));

  const addSkill = () => setForm((f) => ({ ...f, skills: [...f.skills, { ...EMPTY_SKILL }] }));
  const removeSkill = (i: number) =>
    setForm((f) => ({ ...f, skills: f.skills.filter((_, idx) => idx !== i) }));

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  const validateLive = (): IssueMap => {
    const parsed = AgentCardZod.safeParse(form);
    if (parsed.success) return {};
    const map: IssueMap = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (!map[key]) map[key] = issue.message;
    }
    return map;
  };

  const handleSubmit = async (kind: "validate" | "register") => {
    setIssues({});
    setSubmitting(true);
    try {
      if (kind === "validate") {
        const res = await fetch("/api/swarm/manifest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (data.valid) {
          setManifest(data.manifest);
          flash("Manifest schema valid — artifact generated.");
        } else {
          const map: IssueMap = {};
          for (const i of data.issues) map[i.path] = i.message;
          setIssues(map);
        }
      } else {
        const res = await fetch("/api/swarm/agents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (data.ok) {
          onRegistered(data.agent);
          flash(`Agent '${data.agent.name}' registered to swarm.`);
          // also generate manifest preview
          const m = await fetch("/api/swarm/manifest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
          });
          const md = await m.json();
          if (md.valid) setManifest(md.manifest);
        } else {
          const map: IssueMap = {};
          for (const i of data.errors) map[i.path] = i.message;
          setIssues(map);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fieldErr = (key: string) => issues[key];

  return (
    <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* ---------- Form ---------- */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-100">
            <Wand2 className="size-4 text-cyan-400" />
            Manifest Forge
          </h2>
          <span className="rounded border border-slate-700 bg-slate-800/60 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
            Zod-validated
          </span>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Agent ID" err={fieldErr("id")}>
              <input
                value={form.id}
                onChange={(e) => update({ id: e.target.value })}
                placeholder="agent:in:swarm:my-node"
                className={inputCls(!!fieldErr("id"))}
              />
            </Field>
            <Field label="Display Name" err={fieldErr("name")}>
              <input
                value={form.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="My Sovereign Agent"
                className={inputCls(!!fieldErr("name"))}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Semantic Version" err={fieldErr("version")}>
              <input
                value={form.version}
                onChange={(e) => update({ version: e.target.value })}
                placeholder="1.4.2"
                className={inputCls(!!fieldErr("version"))}
              />
            </Field>
            <Field label="Endpoint" err={fieldErr("endpoint")}>
              <input
                value={form.endpoint}
                onChange={(e) => update({ endpoint: e.target.value })}
                className={inputCls(!!fieldErr("endpoint"))}
              />
            </Field>
          </div>

          <Field label="Decentralized Identifier (DID)" err={fieldErr("did")}>
            <input
              value={form.did}
              onChange={(e) => update({ did: e.target.value })}
              placeholder="did:swarm:in:0x…"
              className={inputCls(!!fieldErr("did"))}
            />
          </Field>

          <Field label="Developer Organization" err={fieldErr("developer")}>
            <input
              value={form.developer}
              onChange={(e) => update({ developer: e.target.value })}
              placeholder="Swarm Labs Pvt. Ltd."
              className={inputCls(!!fieldErr("developer"))}
            />
          </Field>

          {/* Pricing */}
          <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Pricing Schedule
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Currency" err={fieldErr("pricing.currency")}>
                <select
                  value={form.pricing.currency}
                  onChange={(e) =>
                    update({ pricing: { ...form.pricing, currency: e.target.value as AgentCardForm["pricing"]["currency"] } })
                  }
                  className={inputCls(false)}
                >
                  {["USDC", "USDT", "INR", "EUR"].map((c) => (
                    <option key={c} value={c} className="bg-slate-900">
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Base Task Fee" err={fieldErr("pricing.base_task_fee")}>
                <input
                  type="number"
                  step="0.001"
                  value={form.pricing.base_task_fee}
                  onChange={(e) =>
                    update({ pricing: { ...form.pricing, base_task_fee: parseFloat(e.target.value) || 0 } })
                  }
                  className={inputCls(!!fieldErr("pricing.base_task_fee"))}
                />
              </Field>
            </div>
          </div>

          {/* Skills */}
          <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Capabilities ({form.skills.length})
              </span>
              <button
                onClick={addSkill}
                className="flex items-center gap-1 rounded border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 text-[10px] font-semibold text-cyan-300 hover:bg-cyan-500/20"
              >
                <Plus className="size-3" /> Add Skill
              </button>
            </div>
            <div className="space-y-3">
              {form.skills.map((skill, i) => (
                <div key={i} className="rounded-md border border-slate-800 bg-slate-900/50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400">SKILL #{i + 1}</span>
                    {form.skills.length > 1 && (
                      <button
                        onClick={() => removeSkill(i)}
                        className="text-slate-500 hover:text-rose-400"
                        aria-label="remove skill"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="mt-2 space-y-2">
                    <Field label="Method Name" err={fieldErr(`skills.${i}.name`)}>
                      <input
                        value={skill.name}
                        onChange={(e) => updateSkill(i, { name: e.target.value })}
                        placeholder="calculate_intermodal_route"
                        className={inputCls(!!fieldErr(`skills.${i}.name`))}
                      />
                    </Field>
                    <Field label="Description" err={fieldErr(`skills.${i}.description`)}>
                      <textarea
                        value={skill.description}
                        onChange={(e) => updateSkill(i, { description: e.target.value })}
                        placeholder="Describe what this skill does…"
                        rows={2}
                        className={inputCls(!!fieldErr(`skills.${i}.description`))}
                      />
                    </Field>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Risk Threshold" err={fieldErr(`skills.${i}.riskThreshold`)}>
                        <select
                          value={skill.riskThreshold}
                          onChange={(e) =>
                            updateSkill(i, {
                              riskThreshold: e.target.value as AgentCardForm["skills"][number]["riskThreshold"],
                            })
                          }
                          className={inputCls(false)}
                        >
                          {["LOW", "MEDIUM", "HIGH"].map((r) => (
                            <option key={r} value={r} className="bg-slate-900">
                              {r}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Requires Approval" err="">
                        <label className="flex h-[38px] cursor-pointer items-center gap-2 rounded border border-slate-800 bg-slate-950 px-3 text-xs text-slate-300">
                          <input
                            type="checkbox"
                            checked={skill.requiresApproval}
                            onChange={(e) => updateSkill(i, { requiresApproval: e.target.checked })}
                            className="accent-cyan-500"
                          />
                          HITL gate
                        </label>
                      </Field>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleSubmit("validate")}
              disabled={submitting}
              className="flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-2.5 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-500/20 disabled:opacity-50"
            >
              <FileJson className="size-4" />
              Validate Schema
            </button>
            <button
              onClick={() => handleSubmit("register")}
              disabled={submitting}
              className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
            >
              <Upload className="size-4" />
              Register to Swarm
            </button>
          </div>

          {toast && (
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-3 py-2 text-xs text-emerald-300">
              {toast}
            </div>
          )}
        </div>
      </div>

      {/* ---------- Artifact preview ---------- */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-100">
            <FileJson className="size-4 text-emerald-400" />
            /.well-known/agent.json
          </h2>
          {manifest && (
            <button
              onClick={() => navigator.clipboard?.writeText(JSON.stringify(manifest, null, 2))}
              className="flex items-center gap-1 rounded border border-slate-700 bg-slate-800/60 px-2 py-1 text-[10px] font-semibold text-slate-300 hover:border-slate-600"
            >
              <Copy className="size-3" /> Copy
            </button>
          )}
        </div>
        <pre className="max-h-[640px] overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-4 font-mono text-[11px] leading-relaxed text-slate-300 swarm-scroll">
          {manifest
            ? JSON.stringify(manifest, null, 2)
            : '// Fill the form and click "Validate Schema"\n// to generate the canonical manifest artifact.'}
        </pre>
      </div>
    </section>
  );
}

function inputCls(err: boolean) {
  return [
    "w-full rounded border bg-slate-950 px-3 py-2 font-mono text-sm text-slate-200 outline-none transition",
    err
      ? "border-rose-500/60 focus:border-rose-400"
      : "border-slate-800 focus:border-cyan-500",
  ].join(" ");
}

function Field({
  label,
  err,
  children,
}: {
  label: string;
  err?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </label>
      {children}
      {err ? <p className="mt-1 text-[10px] text-rose-400">{err}</p> : null}
    </div>
  );
}
