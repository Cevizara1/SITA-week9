import { fileURLToPath } from "node:url";
import { answer } from "../dist/app.js";
import { evaluateCase, readJson, saveRun } from "./evidence.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const lab = readJson(new URL("../data/lab.json", import.meta.url));
const mode = process.argv[2];
if (mode === "ask") {
  const topic = process.argv[3] ?? "shipping";
  console.log(JSON.stringify(answer({ kind: "policy", topic }, {
    documents: lab.documents,
    lookup: id => lab.accounts[id],
    model: source => `Policy: ${source.text}`
  }), null, 2));
} else if (mode === "evaluate" || mode === "regression") {
  const cases = mode === "evaluate" ? lab.cases : [...lab.cases, ...lab.regression];
  const report = saveRun(root, mode, cases.map(testCase => evaluateCase(answer, testCase, lab)), { config: lab.config });
  process.exitCode = report.passed === report.total ? 0 : 1;
} else {
  throw new Error("Use ask [topic], evaluate or regression.");
}
