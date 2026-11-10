import { ArrowUpRight, Sparkles } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import Navigation from "./Navigation";
import type { SectionId } from "../types";
import { apiJson, errorMessage } from "../lib/api";

interface AppShellProps {
  active: SectionId;
  onAccount: () => void;
  children: ReactNode;
}

export default function AppShell({
  active,
  onAccount,
  children,
}: AppShellProps): React.ReactElement {
  const [email, setEmail] = useState("");
  const [sessionError, setSessionError] = useState("");

  useEffect(() => {
    apiJson<{ user: { email: string } }>("/api/auth/me")
      .then(({ user }) => setEmail(user.email))
      .catch((error: unknown) => {
        if (!(error instanceof Error) || !error.message.includes("Sign in")) {
          setSessionError(errorMessage(error));
        }
      });
  }, []);

  async function signOut(): Promise<void> {
    try {
      await apiJson("/api/auth/logout", { method: "POST" });
      window.location.reload();
    } catch (error) {
      setSessionError(errorMessage(error));
    }
  }

  return (
    <div className="min-h-screen">
      <header className="bg-brand text-white">
        <div className="flex w-full items-center justify-between gap-4 px-4 py-4 sm:px-7 sm:py-5">
          <a className="flex min-w-0 items-center gap-3" href="#home" aria-label="ElimuLabs home">
            <span className="brand-mark">E</span>
            <span className="min-w-0">
              <span className="block text-lg font-bold tracking-tight sm:text-xl">
                ElimuLabs
              </span>
              <span className="hidden text-xs text-blue-100 sm:block">
                Learn. Create. Prepare. Choose.
              </span>
            </span>
          </a>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs text-blue-50 md:inline-flex">
              <Sparkles size={14} /> Your classroom companion
            </span>
            <button type="button" onClick={email ? signOut : onAccount} className="button-light">
              {email ? "Sign out" : "Sign in"} <ArrowUpRight size={15} />
            </button>
          </div>
        </div>
      </header>
      <Navigation active={active} />
      <main className="min-h-[72vh] w-full px-4 py-8 sm:px-7 sm:py-11">
        {sessionError && <p role="alert" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{sessionError}</p>}
        {children}
      </main>
      <footer className="border-t border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
        <p>© {new Date().getFullYear()} ElimuLabs · Learn. Create. Prepare. Choose.</p>
      </footer>
    </div>
  );
}
