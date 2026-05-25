import { readFile } from "node:fs/promises";
import { runScenario } from "../src/make-app.mjs";

const scenario = JSON.parse(
  await readFile(new URL("../examples/sample-scenario.json", import.meta.url), "utf8")
);
const output = runScenario(scenario);

assert(output.results["generate-utm-url"].url === "https://example.test/plumber-perth?utm_source=google-ads&utm_medium=cpc&utm_campaign=emergency-plumber-perth&utm_term=emergency-plumber&utm_content=rsa-variant-a", "UTM URL output changed");
assert(output.results["validate-ad-copy"].valid === true, "Sample ad copy should be valid");
assert(output.results["validate-ad-copy"].counts.headlines === 3, "Sample should have three headlines");
assert(output.results["generate-local-schema"].schema.areaServed.length === 3, "Schema should include three service areas");
assert(output.results["create-page-checklist"].summary.totalItems >= 10, "Checklist should include launch QA items");
assert(output.results["create-page-checklist"].csv.includes("Accessibility"), "Checklist should include accessibility QA");

console.log("make custom app blueprint smoke ok");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
