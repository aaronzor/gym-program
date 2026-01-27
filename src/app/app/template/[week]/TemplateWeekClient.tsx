"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BottomSheet } from "../../../../components/BottomSheet";
import { Icon } from "../../../../components/Icon";
import { VideoModal } from "../../../../components/VideoModal";

export type TemplateExercise = {
  id: string;
  order_index: number;
  name: string;
  warmup_sets_target: string | null;
  working_sets_target: number | null;
  reps_target: string | null;
  rpe_target: string | null;
  rest_target: string | null;
  notes: string | null;
  primary_video_url: string | null;
  sub1_name: string | null;
  sub1_video_url: string | null;
  sub2_name: string | null;
  sub2_video_url: string | null;
};

export type TemplateWorkout = {
  id: string;
  workout_index: number;
  label: "Upper" | "Lower";
  exercises: TemplateExercise[];
};

function ChipRow({ ex }: { ex: TemplateExercise }) {
  return (
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
  );
}

export function TemplateWeekClient({
  weekNumber,
  programName,
  workouts
}: {
  weekNumber: number;
  programName: string;
  workouts: TemplateWorkout[];
}) {
  const [expandedByExId, setExpandedByExId] = useState<Record<string, boolean>>({});
  const [swapExId, setSwapExId] = useState<string | null>(null);

  const swapExercise = useMemo(() => {
    if (!swapExId) return null;
    for (const w of workouts) {
      for (const ex of w.exercises) {
        if (ex.id === swapExId) return ex;
      }
    }
    return null;
  }, [swapExId, workouts]);

  return (
    <div className="container" style={{ paddingTop: 24 }}>
      <div className="appBar">
        <div style={{ minWidth: 0 }}>
          <div className="appTitle">Week {weekNumber}</div>
          <div className="label" style={{ marginTop: 4 }}>
            {programName}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link className="btn btnIcon" href="/app/template" aria-label="All weeks" title="All weeks">
            <Icon name="chevronLeft" />
            <span className="srOnly">All weeks</span>
          </Link>
          <Link className="btn btnIcon" href="/app" aria-label="Dashboard" title="Dashboard">
            <Icon name="barbell" />
            <span className="srOnly">Dashboard</span>
          </Link>
        </div>
      </div>

      <div className="stack" style={{ marginTop: 16 }}>
        {workouts.map((w) => (
          <div key={w.id} className="card" style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
              <div>
                <div style={{ fontWeight: 800 }}>
                  Workout {w.workout_index}: {w.label}
                </div>
                <div className="label" style={{ marginTop: 6 }}>
                  {w.exercises.length} exercises
                </div>
              </div>
              <Link
                className="btn btnIcon"
                href={`/app/workout?week=${weekNumber}&workout=${w.workout_index}`}
                aria-label="Start this workout"
                title="Start"
              >
                <Icon name="play" />
                <span className="srOnly">Start</span>
              </Link>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {w.exercises.map((ex) => {
                const expanded = expandedByExId[ex.id] ?? false;
                return (
                  <div
                    key={ex.id}
                    className={expanded ? "card cardInset cardActive" : "card cardInset"}
                    style={{ padding: expanded ? 14 : 10, boxShadow: "none", overflow: "hidden" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                      <button
                        type="button"
                        onClick={() => setExpandedByExId((s) => ({ ...s, [ex.id]: !(s[ex.id] ?? false) }))}
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
                        <div style={{ fontWeight: 800, minWidth: 0 }}>{ex.name}</div>
                      </button>

                      <button
                        type="button"
                        className="btn btnIcon"
                        onClick={() => setExpandedByExId((s) => ({ ...s, [ex.id]: !(s[ex.id] ?? false) }))}
                        aria-label={expanded ? "Collapse" : "Expand"}
                        title={expanded ? "Collapse" : "Expand"}
                      >
                        <Icon name={expanded ? "chevronUp" : "chevronDown"} />
                        <span className="srOnly">{expanded ? "Collapse" : "Expand"}</span>
                      </button>
                    </div>

                    {expanded ? (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                          <ChipRow ex={ex} />
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <VideoModal url={ex.primary_video_url} variant="icon" label="Video" />
                            {(ex.sub1_name && ex.sub1_video_url) || (ex.sub2_name && ex.sub2_video_url) ? (
                              <button
                                type="button"
                                className="btn btnIcon"
                                onClick={() => setSwapExId(ex.id)}
                                aria-label="Substitutions"
                                title="Substitutions"
                              >
                                <Icon name="swap" />
                                <span className="srOnly">Substitutions</span>
                              </button>
                            ) : null}
                          </div>
                        </div>

                        {ex.notes ? (
                          <div className="label" style={{ marginTop: 10 }}>
                            {ex.notes}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <BottomSheet open={swapExId != null} title="Substitutions" onClose={() => setSwapExId(null)}>
        {!swapExercise ? (
          <div className="label">No substitutions.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 800 }}>{swapExercise.name}</div>
            <div className="label">Tap a video to preview.</div>

            {swapExercise.sub1_name && swapExercise.sub1_video_url ? (
              <div className="card cardInset" style={{ padding: 12, boxShadow: "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                  <div style={{ fontWeight: 700 }}>{swapExercise.sub1_name}</div>
                  <VideoModal url={swapExercise.sub1_video_url} variant="icon" label="Video" />
                </div>
              </div>
            ) : null}

            {swapExercise.sub2_name && swapExercise.sub2_video_url ? (
              <div className="card cardInset" style={{ padding: 12, boxShadow: "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                  <div style={{ fontWeight: 700 }}>{swapExercise.sub2_name}</div>
                  <VideoModal url={swapExercise.sub2_video_url} variant="icon" label="Video" />
                </div>
              </div>
            ) : null}
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
