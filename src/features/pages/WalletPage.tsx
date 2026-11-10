import { ArrowDownLeft, CircleDollarSign, Info, WalletCards } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Input } from "../../components/Field";
import PageHeading from "../../components/PageHeading";
import { apiJson, errorMessage, newRequestKey } from "../../lib/api";

interface WalletEntry {
  id: string;
  title: string;
  detail: string;
  amount: number | null;
  status: string;
  createdAt: string;
}

interface WalletData {
  balance: number;
  activities: WalletEntry[];
}

export default function WalletPage(): React.ReactElement {
  const [balance, setBalance] = useState<number | null>(null);
  const [activities, setActivities] = useState<WalletEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const requestKey = useRef("");
  const requestFingerprint = useRef("");

  async function loadWallet(): Promise<void> {
    try {
      const result = await apiJson<WalletData>("/api/wallet");
      setBalance(result.balance);
      setActivities(result.activities);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  useEffect(() => { void loadWallet(); }, []);

  async function requestTopUp(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (busyRef.current) return;
    busyRef.current = true;
    setError("");
    setMessage("");
    setBusy(true);
    const body = { phone, amount: Number(amount) };
    const fingerprint = JSON.stringify(body);
    if (requestFingerprint.current !== fingerprint) {
      requestKey.current = newRequestKey();
      requestFingerprint.current = fingerprint;
    }
    try {
      const result = await apiJson<{ message: string }>("/api/mpesa/stk", {
        method: "POST",
        headers: { "idempotency-key": requestKey.current },
        body: JSON.stringify(body),
      });
      setMessage(result.message);
      requestKey.current = "";
      requestFingerprint.current = "";
      setPhone("");
      setAmount("");
      await loadWallet();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="ACCOUNT FUNDS"
        title="Your learning wallet."
        description="Check your balance and review wallet activity. Top-ups are credited only after confirmed M-Pesa payment."
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
        <section className="wallet-banner">
          <div className="flex items-center justify-between">
            <span className="rounded-xl bg-white/15 p-3"><WalletCards size={23} /></span>
            <span className="text-sm text-blue-100">ElimuLabs wallet</span>
          </div>
          <p className="mt-8 text-sm text-blue-100">Available balance</p>
          <p className="mt-1 text-4xl font-bold">{balance === null ? "—" : `KSh ${balance.toLocaleString("en-KE")}`}</p>
          <p className="mt-2 text-sm text-blue-100">Balance is read from your account on the server.</p>
          <div className="mt-6 flex gap-2">
            <button type="button" className="button-light" onClick={() => { setShowForm(!showForm); setMessage(""); }}>
              <CircleDollarSign size={17} /> Request a top-up
            </button>
            <button type="button" className="button-light" onClick={() => void loadWallet()}>Refresh</button>
          </div>
        </section>
        <aside className="panel-card">
          <div className="flex gap-3">
            <span className="icon-tile"><Info size={20} /></span>
            <div>
              <h2 className="font-semibold text-slate-900">Secure M-Pesa payments</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Approve the official prompt on your phone. ElimuLabs never asks for your M-Pesa PIN. Your wallet changes only after the provider confirms payment.</p>
            </div>
          </div>
        </aside>
      </div>
      {showForm && (
        <form className="panel-card mt-4" onSubmit={requestTopUp}>
          <h2 className="font-semibold text-slate-900">Top up with M-Pesa</h2>
          <p className="mb-4 mt-1 text-sm text-slate-500">The M-Pesa STK prompt will be sent to your phone.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="M-Pesa number" id="wallet-phone" type="tel" placeholder="07XX XXX XXX" autoComplete="tel" required value={phone} onChange={(event) => setPhone(event.target.value)} />
            <Input label="Amount (KSh)" id="wallet-amount" type="number" min="5" max="150000" step="1" required value={amount} onChange={(event) => setAmount(event.target.value)} />
          </div>
          <button className="button-primary mt-5" type="submit" disabled={busy}>
            <ArrowDownLeft size={17} /> {busy ? "Requesting prompt..." : "Send M-Pesa prompt"}
          </button>
          {message && <p role="status" className="mt-3 text-sm text-teal-800">{message}</p>}
        </form>
      )}
      {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
      <section className="panel-card mt-5">
        <h2 className="font-semibold text-slate-900">Wallet history</h2>
        <div className="mt-3 divide-y divide-slate-100">
          {activities.map((item) => (
            <div className="flex items-center justify-between gap-3 py-3" key={item.id}>
              <div>
                <p className="text-sm font-medium text-slate-800">{item.title}</p>
                <p className="mt-1 text-xs text-slate-500">{item.detail} · {new Date(item.createdAt).toLocaleString()}</p>
              </div>
              <span className={`text-sm ${item.status === "COMPLETED" ? "text-teal-700" : "text-amber-700"}`}>
                {item.status === "PENDING" ? "Pending" : item.status === "FAILED" ? "Failed" : `+KSh ${item.amount?.toLocaleString("en-KE")}`}
              </span>
            </div>
          ))}
          {balance !== null && !activities.length && <p className="py-5 text-sm text-slate-500">No wallet activity yet.</p>}
        </div>
      </section>
    </>
  );
}
