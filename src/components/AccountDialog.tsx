"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { apiJson, errorMessage } from "../lib/api";

type AccountMode = "login" | "register" | "forgot";

interface AccountDialogProps {
  onClose: () => void;
}

export default function AccountDialog({
  onClose,
}: AccountDialogProps): React.ReactElement {
  const [mode, setMode] = useState<AccountMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError("");
    setMessage("");
    if (mode === "register" && password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "forgot") {
        const result = await apiJson<{ message: string }>("/api/auth/forgot-password", {
          method: "POST",
          body: JSON.stringify({ email }),
        });
        setMessage(result.message);
      } else if (mode === "register") {
        const result = await apiJson<{ message: string }>("/api/auth/register", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        setMessage(result.message);
      } else {
        await apiJson("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        onClose();
        window.location.reload();
      }
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function resendVerification(): Promise<void> {
    setError("");
    setMessage("");
    try {
      const result = await apiJson<{ message: string }>("/api/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setMessage(result.message);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  const title = mode === "login"
    ? "Welcome back"
    : mode === "register"
      ? "Create your account"
      : "Reset your password";

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-dialog-title"
        className="dialog-card"
      >
        <button type="button" onClick={onClose} aria-label="Close dialog" className="dialog-close">
          <X size={20} />
        </button>
        <span className="brand-mark mx-auto">E</span>
        <h2 id="account-dialog-title" className="mt-4 text-2xl font-bold">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {mode === "register" ? "Join the ElimuLabs learning community." : mode === "forgot" ? "We'll send a reset link if a verified account matches." : "Sign in to access your wallet and saved activity."}
        </p>
        <form className="mt-5 space-y-4 text-left" onSubmit={submit}>
          <label className="field-label">Email address
            <input className="field-control" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          {mode !== "forgot" && (
            <label className="field-label">Password
              <input className="field-control" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "login" ? 1 : 12} required value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
          )}
          {mode === "register" && (
            <label className="field-label">Confirm password
              <input className="field-control" type="password" autoComplete="new-password" minLength={12} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
            </label>
          )}
          <button type="submit" className="button-primary w-full" disabled={busy}>
            {busy ? "Please wait..." : mode === "login" ? "Sign in" : mode === "register" ? "Create account" : "Send reset link"}
          </button>
        </form>
        {error && <p role="alert" className="mt-3 text-left text-sm text-red-700">{error}</p>}
        {message && <p role="status" className="mt-3 text-left text-sm text-teal-800">{message}</p>}
        <div className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
          {mode === "login" ? (
            <>
              <button type="button" className="text-teal-800 underline" onClick={() => setMode("register")}>Create account</button>
              <button type="button" className="text-slate-600 underline" onClick={() => setMode("forgot")}>Forgot password?</button>
            </>
          ) : (
            <button type="button" className="text-teal-800 underline" onClick={() => { setMode("login"); setError(""); setMessage(""); }}>Back to sign in</button>
          )}
        </div>
        {mode === "register" && (
          <button type="button" className="mt-3 text-xs text-slate-500 underline" onClick={resendVerification}>
            Resend verification email
          </button>
        )}
      </section>
    </div>
  );
}
