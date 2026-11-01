import assert from "node:assert/strict";
import { readJson } from "./evidence.mjs";

const [beforePath, afterPath] = process.argv.slice(2);
if (!beforePath || !afterPath) throw new Error("Usage: npm run compare -- BEFORE/report.json AFTER/report.json");
const before = readJson(beforePath);
const after = readJson(afterPath);
assert.equal(before.label, after.label, "Compare the same suite.");
assert.deepEqual(before.data, after.data, "Dataset/configuration changed: rerun both checkpoints under the same inputs.");
assert.deepEqual(before.config, after.config, "Configuration changed.");
assert.deepEqual(before.scripts, after.scripts, "Evaluator/harness changed: this is not a controlled comparison.");
assert.deepEqual(before.results.map(r => r.id), after.results.map(r => r.id), "Cases differ.");
for (let index = 0; index < before.results.length; index++) {
  const old = before.results[index];
  const next = after.results[index];
  console.log(`${old.id}: ${old.passed ? "PASS" : "FAIL"} -> ${next.passed ? "PASS" : "FAIL"}`);
}
console.log(`Before ${before.passed}/${before.total}; after ${after.passed}/${after.total}. Inspect traces and critical failures, not only totals.`);
