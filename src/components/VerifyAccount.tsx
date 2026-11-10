"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiJson, errorMessage } from "../lib/api";

export default function VerifyAccount({ token }: { token: string }): React.ReactElement {
  const [message, setMessage] = useState("Verifying your email...");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    apiJson<{ message: string }>("/api/auth/verify", {
      method: "POST",
      body: JSON.stringify({ token }),
    })
      .then((result) => setMessage(result.message))
      .catch((error: unknown) => {
        setFailed(true);
        setMessage(errorMessage(error));
      });
  }, [token]);

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <section className="panel-card w-full max-w-lg text-center">
        <span className="brand-mark mx-auto">E</span>
        <h1 className="mt-4 text-2xl font-bold text-slate-950">Email verification</h1>
        <p role={failed ? "alert" : "status"} className="mt-3 text-sm text-slate-600">{message}</p>
        <Link className="button-primary mt-6" href="/resources">Continue to ElimuLabs</Link>
      </section>
    </main>
  );
}
