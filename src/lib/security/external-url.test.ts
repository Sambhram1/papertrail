import assert from "node:assert/strict";
import { fetchSafeExternal } from "./external-url";

export async function runExternalUrlTests() {
  const originalFetch = globalThis.fetch;
  let aborted = false;

  globalThis.fetch = async (_input, init) =>
    await new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener(
        "abort",
        () => {
          aborted = true;
          reject(new Error("aborted"));
        },
        { once: true }
      );
    });

  try {
    await assert.rejects(
      () => fetchSafeExternal("https://1.1.1.1/file.jpg", undefined, { timeoutMs: 10 }),
      /abort|timed out/i
    );
    assert.equal(aborted, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
}
