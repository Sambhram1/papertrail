"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function LoginShell() {
  const router = useRouter();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submitAuth() {
    setMessage("");
    setBusy(true);

    try {
      const supabase = getSupabaseBrowserClient();

      if (!supabase) {
        setMessage("Supabase env vars are missing.");
        return;
      }

      const result =
        mode === "sign-in"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password });

      if (result.error) {
        setMessage(result.error.message);
        return;
      }

      if (mode === "sign-up" && !result.data.session) {
        setMessage("Account created. Check your email to confirm your login.");
        return;
      }

      router.push("/");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="paper-shell grid min-h-screen place-items-center px-4 py-8">
      <section className="grid w-full max-w-5xl gap-3 lg:grid-cols-[1fr_420px]">
        <div className="surface p-6 sm:p-8">
          <Link href="/" className="display-title text-4xl leading-none">
            PaperTrail
          </Link>
          <h1 className="display-title mt-10 max-w-3xl text-6xl leading-none sm:text-8xl">
            Your files need an account now.
          </h1>
          <p className="mt-6 max-w-xl text-sm leading-7 text-[var(--paper-2)]">
            Sign in to keep uploaded PDFs, screenshots, source files, checklist state, and analysis
            history saved in Supabase.
          </p>
        </div>

        <div className="paper-card p-5">
          <div className="grid grid-cols-2 border border-black">
            <button
              type="button"
              onClick={() => setMode("sign-in")}
              className={`px-4 py-3 text-xs uppercase ${mode === "sign-in" ? "bg-black text-white" : ""}`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("sign-up")}
              className={`border-l border-black px-4 py-3 text-xs uppercase ${mode === "sign-up" ? "bg-black text-white" : ""}`}
            >
              Sign up
            </button>
          </div>

          <label className="mt-5 block text-xs uppercase text-neutral-500">
            Email
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              className="mt-2 w-full border border-black bg-white px-3 py-3 text-sm normal-case text-black outline-none"
            />
          </label>

          <label className="mt-4 block text-xs uppercase text-neutral-500">
            Password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              className="mt-2 w-full border border-black bg-white px-3 py-3 text-sm normal-case text-black outline-none"
            />
          </label>

          <button
            type="button"
            disabled={!email || !password || busy}
            onClick={() => void submitAuth()}
            className="mono-button-dark mt-5 w-full px-4 py-4 text-xs uppercase disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Working" : mode === "sign-in" ? "Sign in" : "Create account"}
          </button>

          {message ? (
            <p className="mt-4 border border-black px-3 py-3 text-sm leading-6">{message}</p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
