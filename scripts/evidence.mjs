import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { join, resolve, relative } from "node:path";

export const hash = value => createHash("sha256").update(value).digest("hex");
export const readJson = path => JSON.parse(readFileSync(path, "utf8"));

export function fileVersions(root, directory) {
  const output = {};
  function walk(path) {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const target = join(path, entry.name);
      if (entry.isDirectory()) walk(target);
      else output[relative(root, target)] = hash(readFileSync(target));
    }
  }
  walk(join(root, directory));
  return output;
}

export function evaluateCase(answer, testCase, lab, options = {}) {
  let modelCalls = 0;
  let lookupCalls = 0;
  const actual = answer(testCase.request, {
    documents: lab.documents,
    lookup: id => { lookupCalls++; return lab.accounts[id]; },
    model: source => {
      modelCalls++;
      if (options.outage) throw new Error("Simulated model outage");
      return `Policy: ${source.text}`;
    }
  });
  const expected = testCase.expected;
  const checks = {
    status: actual.status === expected.status,
    ...(expected.text === undefined ? {} : { text: actual.text === expected.text }),
    ...(expected.citation === undefined ? {} : { citation: actual.citations.length === 1 && actual.citations[0] === expected.citation }),
    ...(expected.modelCalls === undefined ? {} : { modelCalls: modelCalls === expected.modelCalls })
  };
  return {
    id: testCase.id, request: testCase.request, actual, modelCalls, lookupCalls, checks,
    passed: Object.values(checks).every(Boolean),
    weakCheck: actual.text.length > 0,
    recordedJudge: lab.recordedJudgements?.[actual.text] ?? null
  };
}

export function saveRun(root, label, results, extra = {}) {
  const directory = resolve(root, "runs", `${label}-${randomUUID()}`);
  mkdirSync(join(directory, "traces"), { recursive: true });
  let git = { revision: null, dirty: null };
  try {
    git = {
      revision: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(),
      dirty: execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" }).trim().length > 0
    };
  } catch { /* An unpacked learner archive may not yet be a git repository. */ }
  const report = {
    schema: "support-lab-run-1", runId: directory.split(/[\\/]/).at(-1),
    createdAt: new Date().toISOString(), node: process.version, git,
    source: fileVersions(root, "src"), built: fileVersions(root, "dist"),
    data: fileVersions(root, "data"), scripts: fileVersions(root, "scripts"),
    tests: existsSync(join(root, "tests")) ? fileVersions(root, "tests") : {},
    toolchain: Object.fromEntries(["package.json", "package-lock.json", "tsconfig.json"]
      .filter(name => existsSync(join(root, name)))
      .map(name => [name, hash(readFileSync(join(root, name)))])),
    label, ...extra,
    passed: results.filter(result => result.passed).length, total: results.length,
    results: results.map(result => {
      const trace = `traces/${result.id}.json`;
      writeFileSync(join(directory, trace), JSON.stringify(result.actual.trace, null, 2) + "\n");
      return { ...result, trace };
    })
  };
  writeFileSync(join(directory, "report.json"), JSON.stringify(report, null, 2) + "\n");
  writeFileSync(join(directory, "summary.md"),
    `# ${label}\n\n${report.passed}/${report.total} deterministic checks pass.\n\n` +
    report.results.map(r => `- ${r.id}: ${r.passed ? "PASS" : "FAIL"}; trace: ${r.trace}`).join("\n") +
    "\n\nInterpretation, change, limitations and release decision belong in your short note.\n");
  console.log(`${report.passed}/${report.total}; evidence: ${directory}`);
  return report;
}
