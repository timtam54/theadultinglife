"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type QuestionType =
  | "text"
  | "textarea"
  | "date"
  | "int"
  | "number"
  | "dropdown"
  | "image";

const CATEGORIES = [
  { id: "personal", label: "Personal" },
  { id: "health", label: "Health" },
  { id: "education", label: "Education" },
  { id: "employment", label: "Employment" },
  { id: "admin", label: "Admin & Bookkeeping" },
] as const;

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "text", label: "Short text" },
  { value: "textarea", label: "Long text" },
  { value: "date", label: "Date" },
  { value: "int", label: "Whole number" },
  { value: "number", label: "Decimal number" },
  { value: "dropdown", label: "Choose one (dropdown)" },
  { value: "image", label: "File upload" },
];

type BuilderQuestion = {
  label: string;
  hint: string;
  question_type: QuestionType;
  options: { value: string; label: string }[];
  required: boolean;
  placeholder: string;
};

function emptyQ(): BuilderQuestion {
  return {
    label: "",
    hint: "",
    question_type: "text",
    options: [],
    required: false,
    placeholder: "",
  };
}

type CategoryId = (typeof CATEGORIES)[number]["id"];

export function TemplateBuilder({ isSuper }: { isSuper: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"ai" | "manual">("ai");

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState<CategoryId>("personal");
  const [hint, setHint] = useState("");
  const [visibility, setVisibility] = useState<"catalogue" | "user_private">(
    isSuper ? "catalogue" : "user_private"
  );
  const [questions, setQuestions] = useState<BuilderQuestion[]>([emptyQ()]);

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function runAi() {
    if (!aiPrompt.trim()) return;
    setAiBusy(true);
    setAiError(null);
    try {
      const res = await fetch("/api/templates/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt.trim() }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b?.error ?? `HTTP ${res.status}`);
      }
      const body = (await res.json()) as {
        name: string;
        category_id: CategoryId;
        hint: string | null;
        questions: {
          label: string;
          hint: string | null;
          question_type: QuestionType;
          options: { value: string; label: string }[] | null;
          required: boolean;
          placeholder: string | null;
        }[];
      };
      setName(body.name);
      setCategoryId(body.category_id);
      setHint(body.hint ?? "");
      setQuestions(
        body.questions.map((q) => ({
          label: q.label,
          hint: q.hint ?? "",
          question_type: q.question_type,
          options: q.options ?? [],
          required: q.required,
          placeholder: q.placeholder ?? "",
        }))
      );
      setMode("manual");
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "generate_failed");
    } finally {
      setAiBusy(false);
    }
  }

  async function save() {
    setSaveBusy(true);
    setSaveError(null);
    try {
      const cleaned = questions
        .filter((q) => q.label.trim())
        .map((q) => ({
          label: q.label.trim(),
          hint: q.hint.trim() || null,
          question_type: q.question_type,
          options:
            q.question_type === "dropdown"
              ? q.options.filter((o) => o.value.trim() && o.label.trim())
              : null,
          required: q.required,
          placeholder: q.placeholder.trim() || null,
        }));

      if (!name.trim()) throw new Error("Name required");
      if (cleaned.length === 0) throw new Error("Add at least one question");
      for (const q of cleaned) {
        if (q.question_type === "dropdown" && (q.options?.length ?? 0) < 2) {
          throw new Error(
            `Dropdown "${q.label}" needs at least 2 options`
          );
        }
      }

      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          category_id: categoryId,
          hint: hint.trim() || null,
          visibility,
          questions: cleaned,
        }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b?.message ?? b?.error ?? `HTTP ${res.status}`);
      }
      router.push("/templates");
      router.refresh();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "save_failed");
    } finally {
      setSaveBusy(false);
    }
  }

  function updateQ(i: number, patch: Partial<BuilderQuestion>) {
    setQuestions((prev) =>
      prev.map((q, idx) => (idx === i ? { ...q, ...patch } : q))
    );
  }

  function moveQ(i: number, dir: -1 | 1) {
    setQuestions((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  return (
    <div>
      {/* Mode switcher */}
      <div className="inline-flex rounded-xl border border-tal-line bg-white p-1 mb-6">
        <button
          type="button"
          onClick={() => setMode("ai")}
          className={
            "px-4 py-1.5 rounded-lg text-sm " +
            (mode === "ai"
              ? "bg-tal-plum text-white"
              : "text-tal-plum hover:bg-tal-cream-soft")
          }
        >
          ✨ AI builder
        </button>
        <button
          type="button"
          onClick={() => setMode("manual")}
          className={
            "px-4 py-1.5 rounded-lg text-sm " +
            (mode === "manual"
              ? "bg-tal-plum text-white"
              : "text-tal-plum hover:bg-tal-cream-soft")
          }
        >
          Manual builder
        </button>
      </div>

      {mode === "ai" && (
        <section className="mb-6 rounded-2xl border border-tal-line bg-white p-6">
          <h2 className="font-display text-xl text-tal-plum mb-2">
            Describe the document
          </h2>
          <p className="text-sm text-tal-plum-soft mb-3">
            Type a short description. AI will propose the fields — you can edit
            them before saving.
          </p>
          <div className="flex gap-2 flex-wrap">
            <input
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="e.g. Will, residential lease, Australian student ID card"
              className="flex-1 min-w-[240px] h-11 rounded-xl border border-tal-line px-3 text-sm"
              disabled={aiBusy}
            />
            <button
              type="button"
              onClick={runAi}
              disabled={aiBusy || !aiPrompt.trim()}
              className="h-11 px-5 rounded-xl bg-tal-plum text-white text-sm font-medium disabled:opacity-60"
            >
              {aiBusy ? "Generating…" : "Generate"}
            </button>
          </div>
          {aiError && (
            <div className="mt-3 p-3 rounded-lg border border-red-100 bg-red-50 text-sm text-red-700">
              {aiError}
            </div>
          )}
          {questions.length > 0 && questions[0].label && (
            <div className="mt-3 text-sm text-tal-plum-soft">
              ✅ Draft loaded — switch to Manual builder to review and save.
            </div>
          )}
        </section>
      )}

      {mode === "manual" && (
        <>
          <section className="mb-6 rounded-2xl border border-tal-line bg-white p-6 space-y-3">
            <label className="block text-sm text-tal-plum-soft">
              Template name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full h-10 rounded-lg border border-tal-line px-3 text-sm"
                placeholder="e.g. Will, Residential lease"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm text-tal-plum-soft">
                Life Admin category
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value as CategoryId)}
                  className="mt-1 w-full h-10 rounded-lg border border-tal-line px-2 text-sm bg-white"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-tal-plum-soft">
                Visibility
                <select
                  value={visibility}
                  onChange={(e) =>
                    setVisibility(
                      e.target.value as "catalogue" | "user_private"
                    )
                  }
                  className="mt-1 w-full h-10 rounded-lg border border-tal-line px-2 text-sm bg-white"
                >
                  <option value="user_private">Private to me</option>
                  {isSuper && (
                    <option value="catalogue">Catalogue (all users)</option>
                  )}
                </select>
              </label>
            </div>
            <label className="block text-sm text-tal-plum-soft">
              Description <span className="text-xs">(optional)</span>
              <textarea
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-tal-line p-3 text-sm"
                placeholder="What is this template for?"
              />
            </label>
          </section>

          <section className="mb-6">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="font-display text-xl text-tal-plum">Questions</h2>
              <button
                type="button"
                onClick={() =>
                  setQuestions((prev) => [...prev, emptyQ()])
                }
                className="h-9 px-3 rounded-lg border border-tal-line text-sm text-tal-plum hover:bg-tal-cream-soft"
              >
                + Add question
              </button>
            </div>
            <ul className="space-y-3">
              {questions.map((q, i) => (
                <li
                  key={i}
                  className="rounded-2xl border border-tal-line bg-white p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-tal-plum-soft">
                      Question {i + 1}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveQ(i, -1)}
                        disabled={i === 0}
                        className="h-8 w-8 rounded-lg border border-tal-line text-tal-plum disabled:opacity-40"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveQ(i, 1)}
                        disabled={i === questions.length - 1}
                        className="h-8 w-8 rounded-lg border border-tal-line text-tal-plum disabled:opacity-40"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setQuestions((prev) =>
                            prev.filter((_, idx) => idx !== i)
                          )
                        }
                        className="h-8 px-2 rounded-lg text-sm text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <label className="block text-sm text-tal-plum-soft">
                    Label
                    <input
                      value={q.label}
                      onChange={(e) => updateQ(i, { label: e.target.value })}
                      className="mt-1 w-full h-10 rounded-lg border border-tal-line px-3 text-sm"
                      placeholder="e.g. Date of birth"
                    />
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-sm text-tal-plum-soft">
                      Answer type
                      <select
                        value={q.question_type}
                        onChange={(e) =>
                          updateQ(i, {
                            question_type: e.target.value as QuestionType,
                          })
                        }
                        className="mt-1 w-full h-10 rounded-lg border border-tal-line px-2 text-sm bg-white"
                      >
                        {QUESTION_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-tal-plum-soft mt-6">
                      <input
                        type="checkbox"
                        checked={q.required}
                        onChange={(e) =>
                          updateQ(i, { required: e.target.checked })
                        }
                      />
                      Required
                    </label>
                  </div>

                  <label className="block text-sm text-tal-plum-soft">
                    Hint / help text <span className="text-xs">(optional)</span>
                    <input
                      value={q.hint}
                      onChange={(e) => updateQ(i, { hint: e.target.value })}
                      className="mt-1 w-full h-10 rounded-lg border border-tal-line px-3 text-sm"
                    />
                  </label>

                  {q.question_type === "dropdown" && (
                    <div className="rounded-lg border border-tal-line p-3 space-y-2">
                      <div className="text-xs text-tal-plum-soft">Options</div>
                      {q.options.length === 0 && (
                        <div className="text-xs text-tal-plum-soft">
                          No options yet.
                        </div>
                      )}
                      {q.options.map((opt, oi) => (
                        <div key={oi} className="flex gap-2">
                          <input
                            value={opt.label}
                            onChange={(e) => {
                              const next = [...q.options];
                              next[oi] = {
                                label: e.target.value,
                                value: e.target.value
                                  .toLowerCase()
                                  .replace(/[^a-z0-9]+/g, "_"),
                              };
                              updateQ(i, { options: next });
                            }}
                            className="flex-1 h-9 rounded-lg border border-tal-line px-2 text-sm"
                            placeholder="Option label"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateQ(i, {
                                options: q.options.filter((_, x) => x !== oi),
                              })
                            }
                            className="h-9 px-2 rounded-lg text-sm text-red-700 hover:bg-red-50"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          updateQ(i, {
                            options: [
                              ...q.options,
                              { value: "", label: "" },
                            ],
                          })
                        }
                        className="h-8 px-3 rounded-lg border border-tal-line text-xs text-tal-plum hover:bg-tal-cream-soft"
                      >
                        + Add option
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {saveError && (
            <div className="mb-4 p-3 rounded-lg border border-red-100 bg-red-50 text-sm text-red-700">
              {saveError}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={save}
              disabled={saveBusy}
              className="h-11 px-5 rounded-xl bg-tal-plum text-white text-sm font-medium disabled:opacity-60"
            >
              {saveBusy ? "Saving…" : "Save template"}
            </button>
            <a
              href="/templates"
              className="h-11 px-4 rounded-xl text-sm text-tal-plum hover:bg-tal-cream-soft inline-flex items-center"
            >
              Cancel
            </a>
          </div>
        </>
      )}
    </div>
  );
}
