import dns from "node:dns/promises";
import net from "node:net";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1"
]);

type FetchSafeExternalOptions = {
  maxRedirects?: number;
  timeoutMs?: number;
};

export async function assertSafeExternalUrl(input: string) {
  let url: URL;

  try {
    url = new URL(input);
  } catch {
    throw new Error("Enter a valid URL.");
  }

  if (!/^https?:$/i.test(url.protocol)) {
    throw new Error("Only http and https URLs are allowed.");
  }

  const hostname = url.hostname.toLowerCase();

  if (
    BLOCKED_HOSTNAMES.has(hostname) ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    throw new Error("That URL points to a blocked host.");
  }

  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new Error("That URL points to a private network address.");
    }

    return url.toString();
  }

  const addresses = await dns.lookup(hostname, { all: true });

  if (!addresses.length) {
    throw new Error("Could not resolve that URL.");
  }

  if (addresses.some((entry) => isPrivateIp(entry.address))) {
    throw new Error("That URL resolves to a private network address.");
  }

  return url.toString();
}

export async function fetchSafeExternal(
  input: string,
  init?: RequestInit,
  options: FetchSafeExternalOptions = {}
) {
  const { maxRedirects = 3, timeoutMs } = options;
  let current = await assertSafeExternalUrl(input);
  const timeoutController = timeoutMs ? new AbortController() : null;
  const signal = mergeAbortSignals(init?.signal, timeoutController?.signal);
  const timeout = timeoutMs
    ? setTimeout(() => timeoutController?.abort(new Error("External fetch timed out.")), timeoutMs)
    : null;

  try {
    for (let attempt = 0; attempt <= maxRedirects; attempt += 1) {
      const response = await fetch(current, {
        ...init,
        redirect: "manual",
        signal
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");

        if (!location) {
          throw new Error("The URL redirected without a location.");
        }

        current = await assertSafeExternalUrl(new URL(location, current).toString());
        continue;
      }

      return response;
    }
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }

  throw new Error("Too many redirects.");
}

function mergeAbortSignals(...signals: Array<AbortSignal | undefined>) {
  const activeSignals = signals.filter(Boolean);

  if (!activeSignals.length) {
    return undefined;
  }

  if (activeSignals.length === 1) {
    return activeSignals[0];
  }

  const controller = new AbortController();

  for (const signal of activeSignals) {
    if (signal?.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }

    signal?.addEventListener(
      "abort",
      () => {
        if (!controller.signal.aborted) {
          controller.abort(signal.reason);
        }
      },
      { once: true }
    );
  }

  return controller.signal;
}

function isPrivateIp(value: string) {
  if (net.isIPv4(value)) {
    const [a, b] = value.split(".").map(Number);

    return (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  }

  if (net.isIPv6(value)) {
    const normalized = value.toLowerCase();
    return (
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe80:")
    );
  }

  return true;
}
