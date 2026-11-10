import { Clock3, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import PageHeading from "../../components/PageHeading";
import { apiJson, errorMessage } from "../../lib/api";

interface ActivityEntry {
  id: string;
  type: string;
  title: string;
  detail: string;
  amount: number | null;
  status: "PENDING" | "COMPLETED" | "FAILED";
  createdAt: string;
}

interface HistoryResponse {
  entries: ActivityEntry[];
  nextCursor: string | null;
}

const labels: Record<string, string> = {
  RESOURCE_VIEW: "Resource",
  RESOURCE_PDF: "PDF download",
  RESOURCE_DOCX: "Word download",
  SCHEME_OF_WORK: "Scheme of Work",
  LESSON_PLAN: "Lesson Plan",
  RECORDS_OF_WORK: "Records of Work",
  EXAM: "Exam",
  WALLET_TOPUP: "Wallet",
};

export default function HistoryPage(): React.ReactElement {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);

  async function loadHistory(nextCursor?: string): Promise<void> {
    setBusy(true);
    setError("");
    try {
      const url = new URL("/api/history", window.location.origin);
      url.searchParams.set("limit", "20");
      if (nextCursor) url.searchParams.set("cursor", nextCursor);
      const [history, wallet] = await Promise.all([
        apiJson<HistoryResponse>(`${url.pathname}${url.search}`),
        apiJson<{ balance: number }>("/api/wallet"),
      ]);
      setActivities((previous) => nextCursor ? [...previous, ...history.entries] : history.entries);
      setCursor(history.nextCursor);
      setBalance(wallet.balance);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { void loadHistory(); }, []);

  const filtered = useMemo(() => activities.filter((activity) => {
    const matchesType = filter === "all" ||
      (filter === "pending" ? activity.status === "PENDING" || activity.status === "FAILED" : activity.type === filter);
    const text = `${activity.title} ${activity.detail}`.toLowerCase();
    return matchesType && text.includes(query.toLowerCase());
  }), [activities, filter, query]);

  return (
    <>
      <PageHeading
        eyebrow="YOUR ACCOUNT"
        title="Everything you've been working on."
        description="A private record of your resource, document, assessment and wallet activity."
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <div className="stat-card"><span>Activity items</span><strong>{activities.length}</strong></div>
        <div className="stat-card"><span>Wallet balance</span><strong>{balance === null ? "—" : `KSh ${balance.toLocaleString("en-KE")}`}</strong></div>
      </div>
      <section className="panel-card">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="search-field">
            <Search size={17} />
            <input aria-label="Search activity" type="search" placeholder="Search your activity..." value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <select className="field-control sm:max-w-52" aria-label="Filter activity" value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">All activity</option>
            <option value="RESOURCE_VIEW">Resources</option>
            <option value="SCHEME_OF_WORK">Documents</option>
            <option value="EXAM">Exams</option>
            <option value="WALLET_TOPUP">Wallet</option>
            <option value="pending">Pending / failed</option>
          </select>
        </div>
        {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
        <div className="mt-5 divide-y divide-slate-100">
          {filtered.map((activity) => (
            <div className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between" key={activity.id}>
              <div className="flex items-start gap-3">
                <span className="activity-icon"><Clock3 size={17} /></span>
                <div>
                  <p className="font-medium text-slate-900">{activity.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{activity.detail}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 pl-10 text-xs text-slate-500 sm:pl-0">
                <span className="rounded-full bg-slate-100 px-2.5 py-1">{labels[activity.type] ?? activity.type} · {activity.status.toLowerCase()}</span>
                {activity.amount !== null && <span className={activity.amount < 0 ? "text-slate-700" : "text-teal-700"}>{activity.amount < 0 ? "−" : "+"}KSh {Math.abs(activity.amount).toLocaleString("en-KE")}</span>}
                <time dateTime={activity.createdAt}>{new Date(activity.createdAt).toLocaleString()}</time>
              </div>
            </div>
          ))}
          {!busy && !filtered.length && (
            <div className="py-12 text-center">
              <Clock3 className="mx-auto text-slate-300" size={26} />
              <p className="mt-3 font-medium text-slate-700">No activity to show</p>
              <p className="mt-1 text-sm text-slate-500">Sign in to see saved account activity.</p>
            </div>
          )}
        </div>
        {cursor && <button className="button-secondary mt-4" type="button" disabled={busy} onClick={() => void loadHistory(cursor)}>{busy ? "Loading..." : "Load more"}</button>}
      </section>
    </>
  );
}
