#!/usr/bin/env node
/**
 * Project maintenance CLI.
 *
 * Wraps existing tooling (eslint, tsc, vitest, vite build, capacitor sync)
 * behind a single command so common chores can be run with one verb.
 *
 * Usage:
 *   node scripts/maintain.mjs <command> [...commands] [--no-bail]
 *
 * Commands:
 *   lint        Run ESLint across the repo
 *   typecheck   Run TypeScript in --noEmit mode
 *   test        Run unit tests with Vitest (single run)
 *   build       Production Vite build
 *   preflight   Mobile preflight checks (scripts/mobile-preflight.mjs)
 *   deploy      Build web + capacitor sync (release)
 *   ci          lint + typecheck + test + build
 *   all         ci + preflight
 *   help        Show this help
 *
 * Flags:
 *   --no-bail   Continue running subsequent commands even if one fails
 *
 * Examples:
 *   npm run maintain -- lint
 *   npm run maintain -- ci
 *   npm run maintain -- lint typecheck test --no-bail
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const TASKS = {
  lint:      { desc: "ESLint across the repo",        cmd: "npx", args: ["eslint", "."] },
  typecheck: { desc: "TypeScript --noEmit",           cmd: "npx", args: ["tsc", "--noEmit", "-p", "tsconfig.app.json"] },
  test:      { desc: "Vitest single run",             cmd: "npx", args: ["vitest", "run"] },
  build:     { desc: "Vite production build",         cmd: "npx", args: ["vite", "build"] },
  preflight: { desc: "Mobile preflight",              cmd: "node", args: ["scripts/mobile-preflight.mjs"] },
  deploy:    { desc: "Mobile release build + sync",   cmd: "npm", args: ["run", "mobile:build:release"] },
};

const GROUPS = {
  ci:  ["lint", "typecheck", "test", "build"],
  all: ["lint", "typecheck", "test", "build", "preflight"],
};

const COLOR = {
  reset: "\x1b[0m", dim: "\x1b[2m", bold: "\x1b[1m",
  cyan: "\x1b[36m", green: "\x1b[32m", red: "\x1b[31m", yellow: "\x1b[33m",
};

function printHelp() {
  console.log(`${COLOR.bold}Project maintenance CLI${COLOR.reset}\n`);
  console.log("Usage: npm run maintain -- <command> [...commands] [--no-bail]\n");
  console.log("Commands:");
  for (const [name, t] of Object.entries(TASKS)) {
    console.log(`  ${COLOR.cyan}${name.padEnd(10)}${COLOR.reset} ${t.desc}`);
  }
  for (const [name, list] of Object.entries(GROUPS)) {
    console.log(`  ${COLOR.cyan}${name.padEnd(10)}${COLOR.reset} runs: ${list.join(" → ")}`);
  }
  console.log(`  ${COLOR.cyan}${"help".padEnd(10)}${COLOR.reset} Show this help`);
  console.log("\nFlags:\n  --no-bail   Continue on failure");
}

function run(name) {
  const task = TASKS[name];
  return new Promise((resolveRun) => {
    const started = Date.now();
    console.log(`\n${COLOR.bold}${COLOR.cyan}▶ ${name}${COLOR.reset} ${COLOR.dim}— ${task.desc}${COLOR.reset}`);
    const child = spawn(task.cmd, task.args, { cwd: ROOT, stdio: "inherit", shell: process.platform === "win32" });
    child.on("close", (code) => {
      const ms = Date.now() - started;
      const ok = code === 0;
      const tag = ok ? `${COLOR.green}✓ ok${COLOR.reset}` : `${COLOR.red}✗ failed (exit ${code})${COLOR.reset}`;
      console.log(`${tag} ${COLOR.dim}${name} in ${ms}ms${COLOR.reset}`);
      resolveRun({ name, code: code ?? 1, ms });
    });
  });
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv.includes("help") || argv.includes("-h") || argv.includes("--help")) {
    printHelp();
    process.exit(argv.length === 0 ? 1 : 0);
  }

  const bail = !argv.includes("--no-bail");
  const requested = argv.filter((a) => !a.startsWith("--"));

  const queue = [];
  for (const name of requested) {
    if (GROUPS[name]) queue.push(...GROUPS[name]);
    else if (TASKS[name]) queue.push(name);
    else {
      console.error(`${COLOR.red}Unknown command:${COLOR.reset} ${name}`);
      printHelp();
      process.exit(2);
    }
  }

  const results = [];
  for (const name of queue) {
    const r = await run(name);
    results.push(r);
    if (r.code !== 0 && bail) break;
  }

  console.log(`\n${COLOR.bold}Summary${COLOR.reset}`);
  for (const r of results) {
    const mark = r.code === 0 ? `${COLOR.green}✓${COLOR.reset}` : `${COLOR.red}✗${COLOR.reset}`;
    console.log(`  ${mark} ${r.name} ${COLOR.dim}(${r.ms}ms)${COLOR.reset}`);
  }
  const skipped = queue.length - results.length;
  if (skipped > 0) console.log(`  ${COLOR.yellow}↷ skipped ${skipped} (bail on failure)${COLOR.reset}`);

  const failed = results.some((r) => r.code !== 0);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
