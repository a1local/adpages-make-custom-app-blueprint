#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runScenario } from "../src/make-app.mjs";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const scenarioPath = resolvePath(args.scenario || "examples/sample-scenario.json");
  const outDir = resolve(process.cwd(), args["out-dir"] || ".tmp/make-blueprint");
  const scenario = await readJson(scenarioPath);
  const metadata = await readJson(resolve(rootDir, "config/app-metadata.json"));
  const modules = {};

  for (const moduleInfo of metadata.modules) {
    modules[moduleInfo.id] = await readJson(resolve(rootDir, moduleInfo.path));
  }

  const output = runScenario(scenario);
  await mkdir(outDir, { recursive: true });
  await writeJson(resolve(outDir, "manifest-preview.json"), {
    generatedBy: "adpages-make-blueprint",
    localOnly: true,
    blueprintOnly: true,
    metadata,
    modules
  });
  await writeJson(resolve(outDir, "scenario-output.json"), output);
  await writeJson(resolve(outDir, "utm-url.json"), output.results["generate-utm-url"]);
  await writeJson(resolve(outDir, "ad-copy-validation.json"), output.results["validate-ad-copy"]);
  await writeJson(resolve(outDir, "local-business-schema.json"), output.results["generate-local-schema"]);
  await writeFile(resolve(outDir, "page-qa-checklist.csv"), output.results["create-page-checklist"].csv);

  console.log(`Wrote Make blueprint sample to ${outDir}`);
}

function parseArgs(values) {
  const args = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) {
      continue;
    }
    const key = value.slice(2);
    const next = values[index + 1];
    args[key] = next && !next.startsWith("--") ? next : "true";
    if (args[key] === next) {
      index += 1;
    }
  }
  return args;
}

function resolvePath(value) {
  return resolve(process.cwd(), value);
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
