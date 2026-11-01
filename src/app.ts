export type Document = {
  id: string;
  revision: string;
  topic: string;
  state: "active" | "archived";
  text: string;
};

export type Request = {
  kind: "policy" | "account";
  topic?: string;
  accountId?: string;
};

export type Dependencies = {
  documents: readonly Document[];
  lookup: (id: string) => string | undefined;
  model: (source: Document) => string;
};

export type Event = {
  stage: string;
  sourceId?: string;
  revision?: string;
  outcome?: string;
};

export type Answer = {
  status: "ok" | "refused" | "not_found" | "unavailable" | "invalid";
  text: string;
  citations: string[];
  trace: Event[];
};

export function answer(input: unknown, dependencies: Dependencies): Answer {
  const trace: Event[] = [];
  const result = (status: Answer["status"], text: string, citations: string[] = []): Answer => {
    trace.push({ stage: "response", outcome: status });
    return { status, text, citations, trace };
  };
  if (typeof input !== "object" || input === null) {
    return result("invalid", "Neispravan zahtev.");
  }
  const request = input as Partial<Request>;
  if (request.kind === "account") {
    if (typeof request.accountId !== "string" || !request.accountId.trim()) {
      return result("invalid", "Nedostaje identifikator naloga.");
    }
    const status = dependencies.lookup(request.accountId);
    trace.push({ stage: "lookup", outcome: status === undefined ? "missing" : "found" });
    // D1: instructor demonstration uses only the account route.
    return result("ok", `Status naloga: ${status ?? "active"}.`);
  }
  if (request.kind !== "policy" || typeof request.topic !== "string" || !request.topic.trim()) {
    return result("invalid", "Nedostaje tema.");
  }
  const source = dependencies.documents.find(document => document.topic === request.topic);
  if (!source) {
    return result("refused", "Nema odgovarajućeg izvora.");
  }
  trace.push({ stage: "retrieval", sourceId: source.id, revision: source.revision });
  try {
    const text = dependencies.model(source);
    trace.push({ stage: "model", outcome: "returned" });
    return result("ok", text, [source.id]);
  } catch {
    trace.push({ stage: "model", outcome: "unavailable" });
    return result("unavailable", "Model trenutno nije dostupan.");
  }
}
