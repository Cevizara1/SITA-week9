import assert from "node:assert/strict";
import test from "node:test";
import { answer } from "../dist/app.js";

// Ugovor policy putanje (H1):
// 1. Koristiti aktivan izvor odgovarajuce teme i navesti njegov ID.
// 2. Ne dati prednost arhiviranom izvoru zato sto se ranije nalazi u listi.
// 3. Bez prihvatljivog izvora vratiti "refused", bez poziva modelskoj funkciji.
//
// Sopstveni sinteticki podaci (tema "warranty"), ne javni data/lab.json.
// Ocekivanja su rucno napisani literali iz ugovora, ne izracunati algoritmom aplikacije.

const noLookup = () => { throw new Error("Policy route must not call account lookup"); };

function recordingModel() {
  const received = [];
  const model = source => { received.push(source.id); return `Policy: ${source.text}`; };
  return { model, received };
}

test("active source wins over an archived source listed earlier (topic != refund)", () => {
  const { model, received } = recordingModel();
  const documents = [
    { id: "warranty-2019", revision: "3", topic: "warranty", state: "archived", text: "Warranty lasts 6 months." },
    { id: "shipping-now", revision: "1", topic: "shipping", state: "active", text: "Shipping takes 5 days." },
    { id: "warranty-2026", revision: "4", topic: "warranty", state: "active", text: "Warranty lasts 24 months." }
  ];

  const result = answer({ kind: "policy", topic: "warranty" }, { documents, lookup: noLookup, model });

  assert.equal(result.status, "ok");
  assert.equal(result.text, "Policy: Warranty lasts 24 months.");
  // Citat se proverava odvojeno od teksta: aktivan tekst sa arhiviranim citatom nije prihvatljiv.
  assert.deepEqual(result.citations, ["warranty-2026"]);
  // Arhivirani izvor ne sme ni da stigne do modela.
  assert.deepEqual(received, ["warranty-2026"]);
  // Poreklo u tragu mora da pokazuje stvarno upotrebljen izvor i reviziju.
  const retrieval = result.trace.find(event => event.stage === "retrieval");
  assert.deepEqual(retrieval, { stage: "retrieval", sourceId: "warranty-2026", revision: "4" });
});

test("topic with only archived sources is refused without model execution", () => {
  const { model, received } = recordingModel();
  const documents = [
    { id: "warranty-2018", revision: "1", topic: "warranty", state: "archived", text: "Warranty lasts 3 months." },
    { id: "warranty-2019", revision: "2", topic: "warranty", state: "archived", text: "Warranty lasts 6 months." }
  ];

  const result = answer({ kind: "policy", topic: "warranty" }, { documents, lookup: noLookup, model });

  assert.equal(result.status, "refused");
  assert.deepEqual(result.citations, []);
  assert.deepEqual(received, [], "model must not be called with an archived source");
  assert.ok(!result.trace.some(event => event.stage === "retrieval"), "no source may be recorded as used");
});

test("an active source of a different topic is not an acceptable source", () => {
  const { model, received } = recordingModel();
  const documents = [
    { id: "warranty-2019", revision: "2", topic: "warranty", state: "archived", text: "Warranty lasts 6 months." },
    { id: "returns-now", revision: "1", topic: "returns", state: "active", text: "Returns accepted for 10 days." }
  ];

  const result = answer({ kind: "policy", topic: "warranty" }, { documents, lookup: noLookup, model });

  assert.equal(result.status, "refused");
  assert.deepEqual(result.citations, []);
  assert.deepEqual(received, []);
});
