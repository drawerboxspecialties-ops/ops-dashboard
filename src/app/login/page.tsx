"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

function readyToVerify(code: string) {
  const trimmed = code.trim();
  return trimmed.length === 6 || (trimmed.length >= 4 && trimmed.length <= 32);
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const expired = useSearchParams().get("expired") === "1";
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [mfa, setMfa] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify(mfa ? { code } : { password }),
      });
      const data = (await response.json()) as { error?: string; mfaRequired?: boolean };
      if (!response.ok) {
        if (mfa && data.error?.includes("password again")) setMfa(false);
        throw new Error(data.error || "Wrong password.");
      }
      if (data.mfaRequired) {
        setMfa(true);
        setCode("");
        setBusy(false);
        return;
      }
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wrong password.");
      setBusy(false);
    }
  }

  return (
    <main className="gate">
      <form className="gate-card" onSubmit={submit}>
        <p className="brand-kicker">Drawer Box Specialties</p>
        <h1 className="brand-title">
          Operations <span>Hub</span>
        </h1>
        {mfa ? (
          <>
            <p className="muted">
              Enter the 6-digit authenticator code. No phone? Enter the backup code. It is case sensitive.
            </p>
            <label>
              Authenticator or backup code
              <input
                className="gate-code"
                type="text"
                name="otp"
                inputMode="text"
                autoComplete="one-time-code"
                spellCheck={false}
                value={code}
                onChange={(e) => setCode(e.target.value.slice(0, 32))}
                autoFocus
                required
              />
            </label>
          </>
        ) : (
          <>
            <p className="muted">
              {expired
                ? "Session ended. Enter the hub password to unlock."
                : "Hub password, then Google Authenticator. This page lists internal DBS tools."}
            </p>
            <label>
              Password
              <input
                type="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                autoFocus
                required
              />
            </label>
          </>
        )}
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" className="primary" disabled={busy || (mfa ? !readyToVerify(code) : !password.trim())}>
          {busy ? "Unlocking…" : mfa ? "Verify code" : "Continue"}
        </button>
        {mfa ? (
          <button
            type="button"
            className="ghost"
            disabled={busy}
            onClick={() => {
              setMfa(false);
              setCode("");
              setError("");
            }}
          >
            Back to password
          </button>
        ) : null}
      </form>
    </main>
  );
}
