import { readFile } from "node:fs/promises";
import {
  checklistHeaders,
  runScenario
} from "../src/make-app.mjs";

const root = new URL("../", import.meta.url);
const requiredFiles = [
  "package.json",
  "README.md",
  "PRIVACY.md",
  "config/app-metadata.json",
  "modules/generate-utm-url.json",
  "modules/validate-ad-copy.json",
  "modules/generate-local-schema.json",
  "modules/create-page-checklist.json",
  "examples/sample-scenario.json",
  "src/make-app.mjs",
  "bin/adpages-make-blueprint.mjs",
  "scripts/check.mjs",
  "scripts/smoke.mjs"
];
const moduleFiles = [
  "modules/generate-utm-url.json",
  "modules/validate-ad-copy.json",
  "modules/generate-local-schema.json",
  "modules/create-page-checklist.json"
];
const localSourceFiles = [
  "src/make-app.mjs",
  "bin/adpages-make-blueprint.mjs",
  "scripts/check.mjs",
  "scripts/smoke.mjs",
  ...moduleFiles
];
const expectedModules = [
  "generate-utm-url",
  "validate-ad-copy",
  "generate-local-schema",
  "create-page-checklist"
];
const networkPattern = new RegExp([
  "f" + "etch\\s*\\(",
  "XML" + "HttpRequest",
  "send" + "Beacon",
  "Web" + "Socket",
  "Event" + "Source",
  "node:" + "https",
  "node:" + "http",
  "api\\." + "make\\.com",
  "hook\\." + "make\\.com",
  "adpages" + "\\.com\\/api"
].join("|"), "i");
const secretPattern = new RegExp([
  "MAKE_" + "API_KEY",
  "MAKE_" + "TOKEN",
  "CLIENT_" + "SECRET",
  "OAUTH_" + "CLIENT",
  "Bearer\\s+[a-zA-Z0-9._-]{12,}",
  "api" + "Key\\s*:"
].join("|"), "i");
const unsupportedClaimPattern = new RegExp([
  "production" + "\\s+hosted\\s+api\\s+is\\s+included",
  "oauth" + "\\s+connection\\s+is\\s+included",
  "approved" + "\\s+by\\s+make",
  "ready" + "\\s+for\\s+public\\s+make\\s+review"
].join("|"), "i");

async function main() {
  const contents = new Map();
  for (const file of requiredFiles) {
    const content = await readText(file);
    contents.set(file, content);
    assert(content.trim().length > 0, `${file} must not be empty`);
  }

  const packageJson = JSON.parse(contents.get("package.json"));
  assert(packageJson.type === "module", "package.json must use type=module");
  assert(packageJson.private === true, "package.json must stay private until the Make publication path is final");
  assert(packageJson.scripts?.check, "package.json must define a check script");
  assert(packageJson.scripts?.smoke, "package.json must define a smoke script");
  assert(packageJson.bin?.["adpages-make-blueprint"], "package.json must expose the local CLI");
  assert(!packageJson.dependencies, "blueprint should not add runtime dependencies");

  const metadata = JSON.parse(contents.get("config/app-metadata.json"));
  assert(metadata.localOnly === true, "metadata must mark localOnly=true");
  assert(metadata.blueprintOnly === true, "metadata must mark blueprintOnly=true");
  assert(metadata.hostedBackend === false, "metadata must disclose no hosted backend");
  assert(metadata.requiresOAuth === false, "metadata must disclose no OAuth requirement");
  assert(metadata.requiresSecrets === false, "metadata must disclose no secret requirement");
  assert(metadata.requiresMakeConnection === false, "metadata must disclose no Make connection requirement yet");
  assert(metadata.writesDataAutomatically === false, "metadata must disclose no automatic writes");
  assert(metadata.trackingBeacons === false, "metadata must disclose no tracking beacons");
  assert(Array.isArray(metadata.modules) && metadata.modules.length === expectedModules.length, "metadata must list the four planned modules");
  assert(metadata.modules.map((moduleInfo) => moduleInfo.id).join("|") === expectedModules.join("|"), "metadata module order changed unexpectedly");
  for (const blocker of ["Hosted API", "Auth design", "Make app review", "Real scenario test", "Support/privacy URLs"]) {
    assert(metadata.publishBlockers.some((entry) => entry.includes(blocker)), `metadata must list blocker: ${blocker}`);
  }

  for (const file of moduleFiles) {
    const moduleSpec = JSON.parse(contents.get(file));
    assert(expectedModules.includes(moduleSpec.id), `${file} has unexpected module id`);
    assert(moduleSpec.type === "action", `${file} must be an action module blueprint`);
    assert(moduleSpec.blueprintOnly === true, `${file} must mark blueprintOnly=true`);
    assert(moduleSpec.implementation?.noHostedApi === true, `${file} must disclose no hosted API`);
    assert(moduleSpec.implementation?.noExternalRequest === true, `${file} must disclose no external request`);
    assert(typeof moduleSpec.implementation?.localFunction === "string", `${file} must point to a local function`);
    assert(Array.isArray(moduleSpec.input) && moduleSpec.input.length > 0, `${file} must define inputs`);
    assert(Array.isArray(moduleSpec.output) && moduleSpec.output.length > 0, `${file} must define outputs`);
  }

  const scenario = JSON.parse(contents.get("examples/sample-scenario.json"));
  assert(scenario.localOnly === true, "sample scenario must mark localOnly=true");
  assert(scenario.blueprintOnly === true, "sample scenario must mark blueprintOnly=true");
  assert(Array.isArray(scenario.steps) && scenario.steps.length === expectedModules.length, "sample scenario must include four steps");
  assert(scenario.steps.map((step) => step.module).join("|") === expectedModules.join("|"), "sample scenario must follow expected module order");

  const output = runScenario(scenario);
  assert(output.localOnly === true, "scenario output must stay local-only");
  assert(output.blueprintOnly === true, "scenario output must stay blueprint-only");
  assert(output.results["generate-utm-url"].url.includes("utm_source=google-ads"), "UTM output must include normalized source");
  assert(output.results["generate-utm-url"].url.includes("utm_campaign=emergency-plumber-perth"), "UTM output must include normalized campaign");
  assert(output.results["validate-ad-copy"].valid === true, "sample ad copy should pass validation");
  assert(output.results["generate-local-schema"].schema["@type"] === "LocalBusiness", "schema output must be LocalBusiness");
  assert(output.results["generate-local-schema"].scriptTag.includes("application/ld+json"), "schema output must include JSON-LD script tag");
  assert(output.results["create-page-checklist"].rows.length >= 10, "checklist output must include practical QA rows");
  assert(output.results["create-page-checklist"].csv.startsWith(checklistHeaders.join(",")), "checklist CSV header mismatch");

  for (const file of localSourceFiles) {
    const content = contents.get(file);
    assert(!networkPattern.test(content), `${file} must not make Make, AdPages, or generic network calls`);
    assert(!secretPattern.test(content), `${file} must not contain API keys, tokens, OAuth clients, or bearer secrets`);
    assert(!unsupportedClaimPattern.test(content), `${file} must not claim hosted app, OAuth, or Make approval is already included`);
  }

  const readme = contents.get("README.md");
  assert(readme.includes("Publish Blockers"), "README must list publish blockers");
  assert(readme.includes("does not include a hosted API"), "README must disclose no hosted API");
  assert(readme.includes("does not make network calls"), "README must disclose no network calls");
  assert(readme.includes("does not require OAuth"), "README must disclose no OAuth requirement");
  assert(readme.includes("Make app review"), "README must include Make app review blocker");
  assert(readme.includes("real scenario in Make"), "README must include real Make scenario test blocker");
  assert(readme.includes("support/privacy URLs"), "README must include support/privacy URL blocker");

  const privacy = contents.get("PRIVACY.md");
  assert(privacy.includes("does not make network calls"), "PRIVACY must disclose network behavior");
  assert(privacy.includes("does not require API keys"), "PRIVACY must disclose secret handling");
  assert(privacy.includes("does not require OAuth"), "PRIVACY must disclose OAuth handling");
  assert(privacy.includes("does not write data to Make or AdPages"), "PRIVACY must disclose write behavior");

  console.log("make custom app blueprint check ok");
}

async function readText(file) {
  return readFile(new URL(file, root), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
