import assert from "node:assert/strict";
import test from "node:test";
import { answer } from "../dist/app.js";

test("invalid requests do not call external dependencies", () => {
  const unexpected = () => { throw new Error("Unexpected dependency call"); };
  for (const request of [null, "", {}, { kind: "policy", topic: "" }]) {
    assert.equal(answer(request, { documents: [], lookup: unexpected, model: unexpected }).status, "invalid");
  }
});

test("unsupported topics are refused without model execution", () => {
  const result = answer({ kind: "policy", topic: "missing" }, {
    documents: [], lookup: () => undefined, model: () => { throw new Error("Must not run"); }
  });
  assert.equal(result.status, "refused");
  assert.deepEqual(result.citations, []);
});

test("known suspended account remains suspended", () => {
  const result = answer({ kind: "account", accountId: "synthetic" }, {
    documents: [], lookup: () => "suspended", model: () => { throw new Error("Must not run"); }
  });
  assert.equal(result.text, "Status naloga: suspended.");
  assert.ok(result.trace.some(event => event.stage === "lookup"));
});
