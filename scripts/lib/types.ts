import { z } from "zod";

export const ExerciseTemplateSchema = z.object({
  orderIndex: z.number().int().positive(),
  name: z.string().min(1),

  warmupSetsTarget: z.string().optional(),
  workingSetsTarget: z.number().int().positive().optional(),
  repsTarget: z.string().optional(),
  rpeTarget: z.string().optional(),
  restTarget: z.string().optional(),

  notes: z.string().optional(),

  primaryVideoUrl: z.string().url().optional(),
  sub1Name: z.string().optional(),
  sub1VideoUrl: z.string().url().optional(),
  sub2Name: z.string().optional(),
  sub2VideoUrl: z.string().url().optional(),

  isDropset: z.boolean().optional(),
  supersetTag: z.string().optional()
});

export const WorkoutTemplateSchema = z.object({
  workoutIndex: z.number().int().min(1).max(4),
  label: z.enum(["Upper", "Lower"]),
  exercises: z.array(ExerciseTemplateSchema)
});

export const WeekTemplateSchema = z.object({
  weekNumber: z.number().int().min(1).max(12),
  workouts: z.array(WorkoutTemplateSchema)
});

export const ProgramTemplateSchema = z.object({
  schemaVersion: z.literal(1),
  program: z.object({
    slug: z.string().min(1),
    name: z.string().min(1),
    weeks: z.number().int().positive()
  }),
  weeks: z.array(WeekTemplateSchema)
});

export type ProgramTemplate = z.infer<typeof ProgramTemplateSchema>;
