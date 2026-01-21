import xlsx from "xlsx";
import type { CellObject, WorkSheet } from "xlsx";
import { ProgramTemplate, ProgramTemplateSchema } from "./types.js";

type ParseOptions = {
  xlsxPath: string;
  sheetName?: string;
  slug?: string;
  name?: string;
};

function asTrimmedString(v: unknown): string {
  if (v == null) return "";
  return String(v).replace(/\s+/g, " ").trim();
}

function getCell(sheet: WorkSheet, addr: string): CellObject | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (sheet as any)[addr] as CellObject | undefined;
}

function getCellDisplay(sheet: WorkSheet, addr: string): string {
  const cell = getCell(sheet, addr);
  if (!cell) return "";

  // Prefer formatted text when available (critical for the XLSX "m-d" range hack).
  // SheetJS usually populates `w` when reading from file.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = (cell as any).w;
  if (typeof w === "string" && w.trim() !== "") return asTrimmedString(w);

  // Fallbacks
  if (typeof cell.v === "string") return asTrimmedString(cell.v);
  if (cell.v == null) return "";
  return asTrimmedString(cell.v);
}

function getCellNumber(sheet: WorkSheet, addr: string): number | undefined {
  const cell = getCell(sheet, addr);
  if (!cell) return undefined;
  if (typeof cell.v === "number") return cell.v;
  const txt = getCellDisplay(sheet, addr);
  const n = Number(txt);
  return Number.isFinite(n) ? n : undefined;
}

function getCellHyperlink(sheet: WorkSheet, addr: string): string | undefined {
  const cell = getCell(sheet, addr);
  if (!cell) return undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const link = (cell as any).l;
  const target = link?.Target;
  if (typeof target !== "string" || target.trim() === "") return undefined;
  return target.trim();
}

function normalizeLabel(label: string): "Upper" | "Lower" | null {
  if (label === "Upper") return "Upper";
  if (label === "Lower") return "Lower";
  return null;
}

function deriveSupersetTag(exName: string): string | undefined {
  const m = exName.match(/^\s*([A-Z]\d+)\s*:/);
  if (!m) return undefined;
  return m[1];
}

export function parseEssentials4x(opts: ParseOptions): ProgramTemplate {
  const workbook = xlsx.readFile(opts.xlsxPath, {
    cellHTML: false,
    cellNF: true,
    cellText: true
  });

  const sheetName = opts.sheetName ?? "4x Program";
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(
      `Sheet '${sheetName}' not found. Available sheets: ${workbook.SheetNames.join(", ")}`
    );
  }

  const ref = sheet["!ref"];
  if (!ref) throw new Error("Worksheet has no !ref (empty sheet?)");
  const range = xlsx.utils.decode_range(ref);
  const maxRow = range.e.r + 1;

  const slug = opts.slug ?? "essentials-4x";
  const name = opts.name ?? "Essentials Program - 4x/Week";

  const weeks: ProgramTemplate["weeks"] = [];
  const weekMap = new Map<number, ProgramTemplate["weeks"][number]>();

  let currentWeek: number | null = null;
  let currentWorkoutIndex = 0;
  let currentLabel: "Upper" | "Lower" | null = null;

  for (let r = 1; r <= maxRow; r++) {
    const b = getCellDisplay(sheet, `B${r}`);

    const weekMatch = b.match(/^Week\s+(\d+)$/i);
    if (weekMatch) {
      currentWeek = Number(weekMatch[1]);
      currentWorkoutIndex = 0;
      currentLabel = null;

      if (!weekMap.has(currentWeek)) {
        const week: ProgramTemplate["weeks"][number] = {
          weekNumber: currentWeek,
          workouts: []
        };
        weekMap.set(currentWeek, week);
        weeks.push(week);
      }

      continue;
    }

    const label = normalizeLabel(b);
    if (label) {
      if (currentWeek == null) continue;
      currentWorkoutIndex += 1;
      currentLabel = label;

      const week = weekMap.get(currentWeek);
      if (!week) throw new Error(`Internal error: week ${currentWeek} missing`);
      if (!week.workouts.some((w) => w.workoutIndex === currentWorkoutIndex)) {
        week.workouts.push({
          workoutIndex: currentWorkoutIndex,
          label,
          exercises: []
        });
      }
      // Don't `continue` here: the label row also contains the first exercise.
    }

    if (b.toLowerCase().includes("rest days")) {
      currentLabel = null;
      continue;
    }

    if (currentWeek == null || currentLabel == null || currentWorkoutIndex === 0) continue;

    const exName = getCellDisplay(sheet, `C${r}`);
    if (!exName || exName === "Exercise") continue;

    const week = weekMap.get(currentWeek);
    if (!week) throw new Error(`Internal error: week ${currentWeek} missing`);
    const workout = week.workouts.find((w) => w.workoutIndex === currentWorkoutIndex);
    if (!workout) {
      throw new Error(`Internal error: workout ${currentWorkoutIndex} missing for week ${currentWeek}`);
    }

    const orderIndex = workout.exercises.length + 1;
    const repsTarget = getCellDisplay(sheet, `F${r}`) || undefined;

    workout.exercises.push({
      orderIndex,
      name: exName,
      warmupSetsTarget: getCellDisplay(sheet, `D${r}`) || undefined,
      workingSetsTarget: (() => {
        const n = getCellNumber(sheet, `E${r}`);
        return n != null ? Math.trunc(n) : undefined;
      })(),
      repsTarget,
      rpeTarget: getCellDisplay(sheet, `H${r}`) || undefined,
      restTarget: getCellDisplay(sheet, `I${r}`) || undefined,
      notes: getCellDisplay(sheet, `L${r}`) || undefined,
      primaryVideoUrl: getCellHyperlink(sheet, `C${r}`),
      sub1Name: getCellDisplay(sheet, `J${r}`) || undefined,
      sub1VideoUrl: getCellHyperlink(sheet, `J${r}`),
      sub2Name: getCellDisplay(sheet, `K${r}`) || undefined,
      sub2VideoUrl: getCellHyperlink(sheet, `K${r}`),
      isDropset: repsTarget ? /dropset/i.test(repsTarget) : undefined,
      supersetTag: deriveSupersetTag(exName)
    });
  }

  // Stabilize ordering
  weeks.sort((a, b) => a.weekNumber - b.weekNumber);
  for (const w of weeks) {
    w.workouts.sort((a, b) => a.workoutIndex - b.workoutIndex);
    for (const wo of w.workouts) {
      wo.exercises.sort((a, b) => a.orderIndex - b.orderIndex);
    }
  }

  const parsed: ProgramTemplate = {
    schemaVersion: 1,
    program: {
      slug,
      name,
      weeks: 12
    },
    weeks
  };

  return ProgramTemplateSchema.parse(parsed);
}
