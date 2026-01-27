"use client";

import { useEffect, useMemo, useState } from "react";
import { VideoModal } from "../../../components/VideoModal";
import type { ExerciseRow } from "./workoutRunner";

type Choice = "primary" | "sub1" | "sub2";

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
  userProgramId,
  workoutNumber,
  label,
  exercises,
  completeWorkoutAction
}: {
  userProgramId: string;
  workoutNumber: number;
  label: string;
  exercises: ExerciseRow[];
  completeWorkoutAction: (formData: FormData) => Promise<void>;
}) {
  const [unit, setUnit] = useState<"lb" | "kg">("lb");
  const [choiceByOrder, setChoiceByOrder] = useState<Record<number, Choice>>({});

  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [restLabel, setRestLabel] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

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
              className="card cardInset"
              style={{
                padding: 14,
                boxShadow: "none"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 800 }}>{performed}</div>
                  <div className="label" style={{ marginTop: 4 }}>
                    warmups {ex.warmup_sets_target ?? "-"} · working sets {ex.working_sets_target ?? "-"} · reps{" "}
                    {ex.reps_target ?? "-"} · RPE {ex.rpe_target ?? "-"}
                    {ex.rest_target ? ` · rest ${ex.rest_target}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <VideoModal url={performedVideo} />
                </div>
              </div>

              {ex.notes ? (
                <div className="label" style={{ marginTop: 10 }}>
                  {ex.notes}
                </div>
              ) : null}

              <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className={choice === "primary" ? "btn btnPrimary" : "btn"}
                  onClick={() => setChoiceByOrder((s) => ({ ...s, [order]: "primary" }))}
                >
                  Primary
                </button>
                {ex.sub1_name ? (
                  <button
                    type="button"
                    className={choice === "sub1" ? "btn btnPrimary" : "btn"}
                    onClick={() => setChoiceByOrder((s) => ({ ...s, [order]: "sub1" }))}
                  >
                    {ex.sub1_name}
                  </button>
                ) : null}
                {ex.sub2_name ? (
                  <button
                    type="button"
                    className={choice === "sub2" ? "btn btnPrimary" : "btn"}
                    onClick={() => setChoiceByOrder((s) => ({ ...s, [order]: "sub2" }))}
                  >
                    {ex.sub2_name}
                  </button>
                ) : null}

                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    const end = Date.now() + restSeconds * 1000;
                    setRestEndsAt(end);
                    setRestLabel(ex.rest_target ? `target ${ex.rest_target}` : "target rest");
                  }}
                  title="Start rest timer"
                >
                  Start rest
                </button>
              </div>

              {/* Hidden values used by server action */}
              <input type="hidden" name={`ex_${order}_template_id`} value={ex.id} />
              <input type="hidden" name={`ex_${order}_choice`} value={choice} />
              <input type="hidden" name={`ex_${order}_primary_name`} value={ex.name} />
              <input type="hidden" name={`ex_${order}_primary_video`} value={ex.primary_video_url ?? ""} />
              <input type="hidden" name={`ex_${order}_sub1_name`} value={ex.sub1_name ?? ""} />
              <input type="hidden" name={`ex_${order}_sub1_video`} value={ex.sub1_video_url ?? ""} />
              <input type="hidden" name={`ex_${order}_sub2_name`} value={ex.sub2_name ?? ""} />
              <input type="hidden" name={`ex_${order}_sub2_video`} value={ex.sub2_video_url ?? ""} />

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
          );
        })}

        <button className="btn btnPrimary" type="submit" style={{ padding: "12px 16px" }}>
          Complete workout
        </button>
      </form>
    </div>
  );
}
