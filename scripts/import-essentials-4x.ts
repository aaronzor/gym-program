import fs from "node:fs";
import path from "node:path";
import minimist from "minimist";
import dotenv from "dotenv";
import { parseEssentials4x } from "./lib/parseEssentials4x.js";
import { persistTemplate } from "./lib/persistTemplate.js";

type Args = {
  xlsx?: string;
  sheet?: string;
  "write-json"?: boolean;
  "push-db"?: boolean;
  force?: boolean;
};

function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

function usage(): string {
  return [
    "Usage:",
    "  npm run import:essentials -- --write-json [--push-db] [--force] [--xlsx <path>]",
    "",
    "Options:",
    "  --xlsx <path>       Path to XLSX (default: ./Essentials_Program_-_4x.xlsx)",
    "  --sheet <name>      Worksheet name (default: 4x Program)",
    "  --write-json        Write artifacts/essentials-4x.template.json",
    "  --push-db           Insert template into Supabase (requires env vars)",
    "  --force             Delete existing template by slug first",
    "",
    "Env (for --push-db):",
    "  SUPABASE_URL",
    "  SUPABASE_SERVICE_ROLE_KEY"
  ].join("\n");
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function loadKeyValueFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^([A-Z0-9_]+)\s*[:=]\s*(.+)$/);
    if (!m) continue;
    const key = m[1];
    let value = m[2].trim();
    // strip wrapping quotes
    value = value.replace(/^['"]/, "").replace(/['"]$/, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

function printSummary(template: ReturnType<typeof parseEssentials4x>): void {
  const perWeek = template.weeks.map((w) => {
    const counts = w.workouts.map((wo) => wo.exercises.length);
    const total = counts.reduce((a, b) => a + b, 0);
    return { week: w.weekNumber, counts, total };
  });

  const totals = perWeek.reduce((a, b) => a + b.total, 0);
  console.log(`Parsed ${template.program.slug}: weeks=${template.weeks.length}, totalExercises=${totals}`);
  for (const w of perWeek) {
    console.log(`- Week ${w.week}: workouts=${w.counts.join(",")} total=${w.total}`);
  }
}

async function main(): Promise<void> {
  // Load .env if present; secrets remain uncommitted.
  dotenv.config();
  // Also support a gitignored key/value file (e.g. supabase.txt).
  loadKeyValueFile(path.resolve("supabase.txt"));

  const argv = minimist(process.argv.slice(2)) as Args;
  if (!argv["write-json"] && !argv["push-db"]) {
    console.error(usage());
    process.exitCode = 2;
    return;
  }

  const xlsxPath = argv.xlsx ?? path.resolve("Essentials_Program_-_4x.xlsx");
  const sheetName = argv.sheet ?? "4x Program";

  const template = parseEssentials4x({
    xlsxPath,
    sheetName,
    slug: "essentials-4x",
    name: "Essentials Program - 4x/Week"
  });

  // Basic structural validation beyond schema
  if (template.weeks.length !== 12) {
    throw new Error(`Expected 12 weeks, got ${template.weeks.length}`);
  }
  for (const w of template.weeks) {
    if (w.workouts.length !== 4) {
      throw new Error(`Expected 4 workouts in week ${w.weekNumber}, got ${w.workouts.length}`);
    }
  }

  printSummary(template);

  if (argv["write-json"]) {
    const outDir = path.resolve("artifacts");
    ensureDir(outDir);
    const outPath = path.join(outDir, "essentials-4x.template.json");
    fs.writeFileSync(outPath, JSON.stringify(template, null, 2) + "\n", "utf8");
    console.log(`Wrote ${outPath}`);
  }

  if (argv["push-db"]) {
    const supabaseUrl = requireEnv("SUPABASE_URL");
    const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    await persistTemplate(template, {
      supabaseUrl,
      serviceRoleKey,
      force: Boolean(argv.force)
    });
    console.log("Inserted template into Supabase.");
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
