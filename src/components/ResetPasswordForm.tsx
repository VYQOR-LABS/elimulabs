"use client";

import { useState } from "react";
import Link from "next/link";
import { apiJson, errorMessage } from "../lib/api";

export default function ResetPasswordForm({ token }: { token: string }): React.ReactElement {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError("");
    setMessage("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const result = await apiJson<{ message: string }>("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      setMessage(result.message);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <form className="panel-card w-full max-w-lg" onSubmit={submit}>
        <span className="brand-mark mx-auto">E</span>
        <h1 className="mt-4 text-center text-2xl font-bold text-slate-950">Choose a new password</h1>
        <label className="field-label mt-6">New password
          <input className="field-control" type="password" minLength={12} required autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <label className="field-label mt-4">Confirm new password
          <input className="field-control" type="password" minLength={12} required autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} />
        </label>
        <button className="button-primary mt-5 w-full" disabled={busy}>{busy ? "Updating..." : "Update password"}</button>
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
        {message && <p role="status" className="mt-3 text-sm text-teal-800">{message}</p>}
        <Link className="mt-4 block text-center text-sm text-teal-800 underline" href="/resources">Return to ElimuLabs</Link>
      </form>
    </main>
  );
}
