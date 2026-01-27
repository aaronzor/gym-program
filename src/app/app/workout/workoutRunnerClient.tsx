"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { VideoModal } from "../../../components/VideoModal";
import { BottomSheet } from "../../../components/BottomSheet";
import { createSupabaseBrowserClient } from "../../../lib/supabase/client";
import { Icon } from "../../../components/Icon";
import type { ExerciseRow } from "./workoutRunner";

type Choice = "primary" | "sub1" | "sub2";

type LastRow = {
  performed_exercise_name: string;
  performed_at: string;
  workout_instance_id: string;
  last_set: {
    set_number: number;
    weight: number | null;
    reps: number | null;
    rpe: number | null;
    unit: string | null;
  } | null;
  sets: Array<{ set_number: number; weight: number | null; reps: number | null; rpe: number | null; unit: string | null }>;
};

type HistorySession = LastRow;

function compareBestSet(a: { weight: number; reps: number } | null, b: { weight: number; reps: number } | null): number {
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;
  if (a.weight !== b.weight) return a.weight > b.weight ? 1 : -1;
  if (a.reps !== b.reps) return a.reps > b.reps ? 1 : -1;
  return 0;
}

function parseRestSeconds(restTarget: string | null): number {
  if (!restTarget) return 90;
  const s = restTarget.trim().toLowerCase();
  if (s === "0" || s.includes("0 min")) return 0;

  // Examples in your sheet: "~2 min", "~1.5 min"
  const m = s.match(/([0-9]+(?:\.[0-9]+)?)\s*(min|mins|minute|minutes)/);
  if (m) {
    const mins = Number(m[1]);
    if (Number.isFinite(mins)) return Math.max(0, Math.round(mins * 60));
  }
  const sec = s.match(/([0-9]+)\s*(s|sec|secs|second|seconds)/);
  if (sec) {
    const n = Number(sec[1]);
    if (Number.isFinite(n)) return Math.max(0, Math.round(n));
  }

  return 90;
}

function fmt(seconds: number): string {
  const s = Math.max(0, Math.trunc(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function WorkoutRunnerClient({
  programTemplateId,
  userProgramId,
  workoutNumber,
  label,
  exercises,
  defaultUnit,
  completeWorkoutAction
}: {
  programTemplateId: string;
  userProgramId: string;
  workoutNumber: number;
  label: string;
  exercises: ExerciseRow[];
  defaultUnit: "kg" | "lb";
  completeWorkoutAction: (formData: FormData) => Promise<void>;
}) {
  const [unit, setUnit] = useState<"lb" | "kg">(defaultUnit);
  const [choiceByOrder, setChoiceByOrder] = useState<Record<number, Choice>>({});

  const [swapOpenOrder, setSwapOpenOrder] = useState<number | null>(null);

  const [expandedByOrder, setExpandedByOrder] = useState<Record<number, boolean>>({ 1: true });

  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [restLabel, setRestLabel] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const [lastOpenFor, setLastOpenFor] = useState<string | null>(null);
  const [lastPrefetchStatus, setLastPrefetchStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [lastPrefetchError, setLastPrefetchError] = useState<string | null>(null);
  const [lastByName, setLastByName] = useState<Record<string, LastRow | null>>({});

  const [historyStatus, setHistoryStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historySessions, setHistorySessions] = useState<HistorySession[]>([]);
  const [historyIndex, setHistoryIndex] = useState(0);

  useEffect(() => {
    if (!restEndsAt) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [restEndsAt]);

  const remaining = restEndsAt ? Math.max(0, Math.ceil((restEndsAt - now) / 1000)) : 0;
  const active = Boolean(restEndsAt && remaining > 0);

  useEffect(() => {
    if (!restEndsAt) return;
    if (remaining > 0) return;
    // Auto-clear after it hits 0, but keep it visible briefly
    const t = setTimeout(() => {
      setRestEndsAt(null);
      setRestLabel(null);
    }, 1200);
    return () => clearTimeout(t);
  }, [restEndsAt, remaining]);

  // Prefetch "last time" data for all names in this workout (primary + substitutions).
  // This keeps the workout UI uncluttered: tapping "Last" is instant.
  const prefetchNames = useMemo(() => {
    const names = new Set<string>();
    for (const ex of exercises) {
      if (ex.name) names.add(ex.name);
      if (ex.sub1_name) names.add(ex.sub1_name);
      if (ex.sub2_name) names.add(ex.sub2_name);
    }
    return Array.from(names).filter((n) => n.trim() !== "");
  }, [exercises]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!prefetchNames.length) return;
      setLastPrefetchStatus("loading");
      setLastPrefetchError(null);

      try {
        const supabase = createSupabaseBrowserClient();
        const res = await supabase.rpc("get_last_exercise_performance", {
          program_template_id: programTemplateId,
          exercise_names: prefetchNames
        });
        if (res.error) throw new Error(res.error.message);

        // Build map of results
        const rows = (res.data as unknown as LastRow[] | null) ?? [];
        const byName: Record<string, LastRow | null> = {};
        for (const name of prefetchNames) byName[name] = null;
        for (const row of rows) {
          if (row?.performed_exercise_name) byName[row.performed_exercise_name] = row;
        }

        if (cancelled) return;
        setLastByName(byName);
        setLastPrefetchStatus("ready");
      } catch (e) {
        if (cancelled) return;
        setLastPrefetchStatus("error");
        setLastPrefetchError(e instanceof Error ? e.message : "Failed to load exercise history");
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [programTemplateId, prefetchNames]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!lastOpenFor) return;
      setHistoryStatus("loading");
      setHistoryError(null);
      setHistorySessions([]);
      setHistoryIndex(0);

      try {
        const supabase = createSupabaseBrowserClient();
        const res = await supabase.rpc("get_exercise_history", {
          program_template_id: programTemplateId,
          exercise_name: lastOpenFor,
          limit_n: 12,
          offset_n: 0
        });
        if (res.error) throw new Error(res.error.message);
        const rows = (res.data as unknown as HistorySession[] | null) ?? [];
        if (cancelled) return;
        setHistorySessions(rows);
        setHistoryStatus("ready");
      } catch (e) {
        if (cancelled) return;
        setHistoryStatus("error");
        setHistoryError(e instanceof Error ? e.message : "Failed to load exercise history");
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [lastOpenFor, programTemplateId]);

  const header = useMemo(() => {
    return `${label} workout`;
  }, [label]);

  return (
    <div className="card" style={{ marginTop: 16, padding: 18 }}>
      {restEndsAt ? (
        <div className="restBanner">
          <div className="restBannerInner">
            <div>
              <div className="restBannerTitle">Rest timer{restLabel ? ` · ${restLabel}` : ""}</div>
              <div className="restBannerTime">{active ? fmt(remaining) : "Done"}</div>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setRestEndsAt(null);
                  setRestLabel(null);
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>{header}</h2>
          <div className="label" style={{ marginTop: 6 }}>
            Fill in working sets. Substitutions apply to the whole exercise.
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span className="label">Unit</span>
          <select
            className="input"
            value={unit}
            onChange={(e) => setUnit(e.target.value === "kg" ? "kg" : "lb")}
            style={{ width: 96 }}
          >
            <option value="lb">lb</option>
            <option value="kg">kg</option>
          </select>
        </div>
      </div>

      <form action={completeWorkoutAction} style={{ marginTop: 14, display: "grid", gap: 14 }}>
        <input type="hidden" name="user_program_id" value={userProgramId} />
        <input type="hidden" name="workout_number" value={String(workoutNumber)} />
        <input type="hidden" name="unit" value={unit} />

        {exercises.map((ex) => {
          const order = ex.order_index;
          const choice: Choice = choiceByOrder[order] ?? "primary";
          const expanded = expandedByOrder[order] ?? false;

          const performed =
            choice === "sub1"
              ? ex.sub1_name || ex.name
              : choice === "sub2"
                ? ex.sub2_name || ex.name
                : ex.name;

          const performedVideo =
            choice === "sub1"
              ? ex.sub1_video_url || ex.primary_video_url
              : choice === "sub2"
                ? ex.sub2_video_url || ex.primary_video_url
                : ex.primary_video_url;

          const workingSets = Math.max(1, ex.working_sets_target ?? 1);
          const restSeconds = parseRestSeconds(ex.rest_target);

          return (
            <div
              key={ex.id}
              className={expanded ? "card cardInset cardActive" : "card cardInset"}
              style={{
                padding: expanded ? 14 : 10,
                boxShadow: "none",
                overflow: "hidden"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => setExpandedByOrder((s) => ({ ...s, [order]: !(s[order] ?? false) }))}
                  style={{
                    padding: 0,
                    border: 0,
                    background: "transparent",
                    color: "inherit",
                    font: "inherit",
                    textAlign: "left",
                    cursor: "pointer",
                    minWidth: 0,
                    flex: "1 1 auto"
                  }}
                  aria-label={expanded ? "Collapse exercise" : "Expand exercise"}
                >
                  <div style={{ fontWeight: 800, minWidth: 0 }}>{performed}</div>
                </button>

                <button
                  type="button"
                  className="btn btnIcon"
                  onClick={() => setExpandedByOrder((s) => ({ ...s, [order]: !(s[order] ?? false) }))}
                  aria-label={expanded ? "Collapse" : "Expand"}
                  title={expanded ? "Collapse" : "Expand"}
                >
                  <Icon name={expanded ? "chevronUp" : "chevronDown"} />
                  <span className="srOnly">{expanded ? "Collapse" : "Expand"}</span>
                </button>
              </div>

              <div style={{ display: expanded ? "block" : "none" }}>
                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    alignItems: "flex-start",
                    flexWrap: "wrap"
                  }}
                >
                  <div className="chips">
                    <span className="chip" title="Warm-up sets">
                      <span className="chipIcon" aria-hidden="true">
                        <Icon name="warmup" size={16} />
                      </span>
                      <span className="srOnly">Warm-up sets</span>
                      <span className="chipValue">{ex.warmup_sets_target ?? "-"}</span>
                    </span>

                    <span className="chip" title="Working sets">
                      <span className="chipIcon" aria-hidden="true">
                        <Icon name="sets" size={16} />
                      </span>
                      <span className="srOnly">Working sets</span>
                      <span className="chipValue">{ex.working_sets_target ?? "-"}</span>
                    </span>

                    <span className="chip" title="Reps target">
                      <span className="chipLabel">R</span>
                      <span className="srOnly">Reps</span>
                      <span className="chipValue">{ex.reps_target ?? "-"}</span>
                    </span>

                    <span className="chip" title="RPE target">
                      <span className="chipIcon" aria-hidden="true">
                        <Icon name="target" size={16} />
                      </span>
                      <span className="srOnly">RPE</span>
                      <span className="chipValue">{ex.rpe_target ?? "-"}</span>
                    </span>

                    {ex.rest_target ? (
                      <span className="chip" title="Rest target">
                        <span className="chipIcon" aria-hidden="true">
                          <Icon name="timer" size={16} />
                        </span>
                        <span className="srOnly">Rest</span>
                        <span className="chipValue">{ex.rest_target}</span>
                      </span>
                    ) : null}
                  </div>

                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <VideoModal url={performedVideo} variant="icon" label="Video" />
                    <button
                      type="button"
                      className="btn btnIcon"
                      onClick={() => setLastOpenFor(performed)}
                      aria-label="Last time"
                      title="Last time"
                    >
                      <Icon name="history" />
                      <span className="srOnly">Last time</span>
                    </button>
                    <button
                      type="button"
                      className="btn btnIcon"
                      onClick={() => {
                        const end = Date.now() + restSeconds * 1000;
                        setRestEndsAt(end);
                        setRestLabel(ex.rest_target ? `target ${ex.rest_target}` : "target rest");
                      }}
                      aria-label="Start rest"
                      title="Start rest"
                    >
                      <Icon name="timer" />
                      <span className="srOnly">Start rest</span>
                    </button>
                    <button
                      type="button"
                      className="btn btnIcon"
                      onClick={() => setSwapOpenOrder(order)}
                      aria-label="Swap exercise"
                      title="Swap"
                    >
                      <Icon name="swap" />
                      <span className="srOnly">Swap</span>
                    </button>
                  </div>
                </div>

                {ex.notes ? (
                  <div className="label" style={{ marginTop: 10 }}>
                    {ex.notes}
                  </div>
                ) : null}

                <div
                  style={{
                    marginTop: 14,
                    borderTop: "1px solid var(--line)",
                    paddingTop: 12,
                    display: "grid",
                    gap: 10
                  }}
                >
                  {Array.from({ length: workingSets }).map((_, i) => {
                    const setNumber = i + 1;
                    return (
                      <div
                        key={setNumber}
                        className="setRow"
                      >
                        <div className="setLabel">Set {setNumber}</div>
                        <input
                          className="input"
                          inputMode="decimal"
                          name={`log_${order}_set_${setNumber}_weight`}
                          placeholder={`Weight (${unit})`}
                        />
                        <input
                          className="input"
                          inputMode="numeric"
                          name={`log_${order}_set_${setNumber}_reps`}
                          placeholder="Reps"
                        />
                        <input
                          className="input"
                          inputMode="decimal"
                          name={`log_${order}_set_${setNumber}_rpe`}
                          placeholder="RPE"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Substitutions moved into a bottom sheet to keep mobile UI compact */}

              {/* Hidden values used by server action */}
              <input type="hidden" name={`ex_${order}_template_id`} value={ex.id} />
              <input type="hidden" name={`ex_${order}_choice`} value={choice} />
              <input type="hidden" name={`ex_${order}_primary_name`} value={ex.name} />
              <input type="hidden" name={`ex_${order}_primary_video`} value={ex.primary_video_url ?? ""} />
              <input type="hidden" name={`ex_${order}_sub1_name`} value={ex.sub1_name ?? ""} />
              <input type="hidden" name={`ex_${order}_sub1_video`} value={ex.sub1_video_url ?? ""} />
              <input type="hidden" name={`ex_${order}_sub2_name`} value={ex.sub2_name ?? ""} />
              <input type="hidden" name={`ex_${order}_sub2_video`} value={ex.sub2_video_url ?? ""} />

            </div>
          );
        })}

        <button className="btn btnPrimary" type="submit" style={{ padding: "12px 16px" }}>
          Complete workout
        </button>
      </form>

      <BottomSheet
        open={swapOpenOrder != null}
        title="Swap exercise"
        onClose={() => setSwapOpenOrder(null)}
      >
        {swapOpenOrder != null ? (
          (() => {
            const ex = exercises.find((e) => e.order_index === swapOpenOrder);
            if (!ex) return <div className="label">Exercise not found.</div>;

            const choice: Choice = choiceByOrder[swapOpenOrder] ?? "primary";

            const options: Array<{ value: Choice; label: string }> = [
              { value: "primary", label: ex.name }
            ];
            if (ex.sub1_name) options.push({ value: "sub1", label: ex.sub1_name });
            if (ex.sub2_name) options.push({ value: "sub2", label: ex.sub2_name });

            return (
              <div style={{ display: "grid", gap: 10 }}>
                <div className="label">Choose a substitution for this whole exercise slot.</div>
                <div style={{ display: "grid", gap: 8 }}>
                  {options.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={opt.value === choice ? "btn btnPrimary" : "btn"}
                      style={{ justifyContent: "flex-start", width: "100%" }}
                      onClick={() => {
                        setChoiceByOrder((s) => ({ ...s, [swapOpenOrder]: opt.value }));
                        setSwapOpenOrder(null);
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()
        ) : null}
      </BottomSheet>

      <BottomSheet
        open={Boolean(lastOpenFor)}
        title={lastOpenFor ? `Last time: ${lastOpenFor}` : "Last time"}
        onClose={() => {
          setLastOpenFor(null);
          setHistoryStatus("idle");
          setHistoryError(null);
          setHistorySessions([]);
          setHistoryIndex(0);
        }}
      >
        {lastPrefetchStatus === "loading" || historyStatus === "loading" ? <div className="label">Loading…</div> : null}
        {lastPrefetchStatus === "error" ? (
          <div className="label" style={{ color: "rgba(245, 158, 11, 0.9)" }}>
            {lastPrefetchError ?? "Failed to load history"}
          </div>
        ) : null}

        {historyStatus === "error" ? (
          <div className="label" style={{ color: "rgba(245, 158, 11, 0.9)" }}>
            {historyError ?? "Failed to load exercise history"}
          </div>
        ) : null}

        {lastOpenFor && historyStatus === "ready" && historySessions.length === 0 ? (
          <div className="label">No previous logged workout for this exercise yet.</div>
        ) : null}

        {lastOpenFor && historyStatus === "ready" && historySessions.length ? (
          <div style={{ display: "grid", gap: 10 }}>
            {(() => {
              const session = historySessions[Math.min(historyIndex, historySessions.length - 1)];
              const bestByUnit = new Map<string, { weight: number; reps: number }>();

              for (const s of historySessions) {
                for (const set of s.sets ?? []) {
                  if (set.weight == null || set.reps == null) continue;
                  const unitKey = (set.unit ?? "").trim() || "";
                  const curr = bestByUnit.get(unitKey) ?? null;
                  const candidate = { weight: Number(set.weight), reps: Number(set.reps) };
                  if (compareBestSet(candidate, curr) > 0) bestByUnit.set(unitKey, candidate);
                }
              }

              const bestLines = Array.from(bestByUnit.entries())
                .filter(([unitKey]) => unitKey !== "")
                .map(([unitKey, v]) => `${v.weight}${unitKey} x ${v.reps}`);

              return (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div className="label">
                      Session {historyIndex + 1}/{historySessions.length} · {new Date(session.performed_at).toLocaleString()}
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button
                        type="button"
                        className="btn btnIcon"
                        disabled={historyIndex >= historySessions.length - 1}
                        onClick={() => setHistoryIndex((i) => Math.min(i + 1, historySessions.length - 1))}
                        aria-label="Older session"
                        title="Older"
                      >
                        <Icon name="chevronLeft" />
                        <span className="srOnly">Older</span>
                      </button>
                      <button
                        type="button"
                        className="btn btnIcon"
                        disabled={historyIndex <= 0}
                        onClick={() => setHistoryIndex((i) => Math.max(i - 1, 0))}
                        aria-label="Newer session"
                        title="Newer"
                      >
                        <Icon name="chevronRight" />
                        <span className="srOnly">Newer</span>
                      </button>
                    </div>
                  </div>

                  {bestLines.length ? (
                    <div>
                      <div style={{ fontWeight: 800 }}>Best set (recent {historySessions.length})</div>
                      <div className="label" style={{ marginTop: 4 }}>
                        {bestLines.join(" · ")}
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <div style={{ fontWeight: 800 }}>Last working set (that session)</div>
                    <div className="label" style={{ marginTop: 4 }}>
                      {session.last_set
                        ? `Set ${session.last_set.set_number}: ${session.last_set.weight ?? "-"}${
                            session.last_set.unit ?? ""
                          } x ${session.last_set.reps ?? "-"} @ ${session.last_set.rpe ?? "-"}`
                        : "No working sets logged"}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <Link className="btn" href={`/app/history/${session.workout_instance_id}`}>
                      View full workout
                    </Link>
                  </div>

                  {Array.isArray(session.sets) && session.sets.length ? (
                    <div>
                      <div style={{ fontWeight: 800 }}>All working sets (that session)</div>
                      <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                        {session.sets.map((set) => (
                          <div
                            key={set.set_number}
                            className="card"
                            style={{ padding: 10, boxShadow: "none", background: "rgba(255,255,255,0.04)" }}
                          >
                            <div className="label">
                              Set {set.set_number}: {set.weight ?? "-"}
                              {set.unit ?? ""} x {set.reps ?? "-"} @ {set.rpe ?? "-"}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              );
            })()}
          </div>
        ) : null}
      </BottomSheet>
    </div>
  );
}
