import { ClipboardCheck } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Input, Select } from "../../components/Field";
import DocumentPreview from "../../components/DocumentPreview";
import PageHeading from "../../components/PageHeading";
import { useCurriculum } from "../../hooks/useCurriculum";
import { useGrades } from "../../hooks/useGrades";
import { apiJson, errorMessage, newRequestKey } from "../../lib/api";

interface GeneratedResult {
  document: { id: string; title: string; content: string; markingScheme: string | null };
  balance: number;
}

export default function ExamPage(): React.ReactElement {
  const [grade, setGrade] = useState("");
  const [areaId, setAreaId] = useState("");
  const [term, setTerm] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [mcqCount, setMcqCount] = useState(20);
  const [mcqMarks, setMcqMarks] = useState(20);
  const [structuredCount, setStructuredCount] = useState(5);
  const [structuredMarks, setStructuredMarks] = useState(80);
  const [requiredTotal, setRequiredTotal] = useState(100);
  const [prompt, setPrompt] = useState("");
  const [generated, setGenerated] = useState<GeneratedResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const requestKey = useRef("");
  const requestFingerprint = useRef("");
  const { areas, loadingAreas } = useCurriculum(grade, areaId);
  const { grades, error: gradeError } = useGrades();
  const total = useMemo(() => mcqMarks + structuredMarks, [mcqMarks, structuredMarks]);

  async function generateExam(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (busyRef.current) return;
    busyRef.current = true;
    setError("");
    setGenerated(null);
    setBusy(true);
    const body = {
      type: "EXAM",
      grade: Number(grade),
      areaId,
      term,
      year: Number(year),
      mcqCount,
      mcqMarks,
      structuredCount,
      structuredMarks,
      requiredTotal,
      prompt,
    };
    const fingerprint = JSON.stringify(body);
    if (requestFingerprint.current !== fingerprint) {
      requestKey.current = newRequestKey();
      requestFingerprint.current = fingerprint;
    }
    try {
      const result = await apiJson<GeneratedResult>("/api/generate", {
        method: "POST",
        headers: { "idempotency-key": requestKey.current },
        body: JSON.stringify(body),
      });
      setGenerated(result);
      requestKey.current = "";
      requestFingerprint.current = "";
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
        eyebrow="ASSESSMENT STUDIO"
        title="Plan an assessment with confidence."
        description="Create an examination paper and a matching marking scheme from your requirements."
      />
      <form className="panel-card" onSubmit={generateExam}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select label="Grade" id="exam-grade" required value={grade} onChange={(event) => {
            setGrade(event.target.value);
            setAreaId("");
          }}>
            <option value="">Select grade</option>
            {grades.map((value) => <option key={value} value={value}>Grade {value}</option>)}
          </Select>
          <Select label="Learning area" id="exam-area" required value={areaId} disabled={!grade || loadingAreas} onChange={(event) => setAreaId(event.target.value)}>
            <option value="">{loadingAreas ? "Loading areas..." : "Select learning area"}</option>
            {areas.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Select>
          <Select label="Term" id="exam-term" required value={term} onChange={(event) => setTerm(event.target.value)}>
            <option value="">Select term</option>
            {[1, 2, 3].map((value) => <option key={value}>Term {value}</option>)}
          </Select>
          <Input label="Year" id="exam-year" type="number" min="2020" max="2100" required value={year} onChange={(event) => setYear(event.target.value)} />
        </div>
        <div className="my-6 border-t border-slate-100" />
        <div className="grid gap-5 md:grid-cols-2">
          <fieldset className="rounded-xl bg-slate-50 p-4">
            <legend className="px-1 text-sm font-semibold text-slate-800">Multiple choice</legend>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <Input label="Questions" id="mcq-count" type="number" min="1" max="80" required value={mcqCount} onChange={(event) => setMcqCount(Number(event.target.value))} />
              <Input label="Section marks" id="mcq-marks" type="number" min="1" max="200" required value={mcqMarks} onChange={(event) => setMcqMarks(Number(event.target.value))} />
            </div>
          </fieldset>
          <fieldset className="rounded-xl bg-slate-50 p-4">
            <legend className="px-1 text-sm font-semibold text-slate-800">Structured questions</legend>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <Input label="Questions" id="structured-count" type="number" min="1" max="30" required value={structuredCount} onChange={(event) => setStructuredCount(Number(event.target.value))} />
              <Input label="Section marks" id="structured-marks" type="number" min="1" max="300" required value={structuredMarks} onChange={(event) => setStructuredMarks(Number(event.target.value))} />
            </div>
          </fieldset>
        </div>
        <div className="mt-5 grid items-end gap-4 sm:grid-cols-[1fr_1fr_auto]">
          <div className="rounded-xl bg-teal-50 p-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-teal-800">Calculated total</span>
            <strong className="mt-1 block text-2xl text-teal-950">{total} marks</strong>
          </div>
          <Input label="Required total marks" id="exam-total" type="number" min="1" max="500" required value={requiredTotal} onChange={(event) => setRequiredTotal(Number(event.target.value))} />
          <span className="text-sm text-slate-600">Generation · KSh 15</span>
        </div>
        {total !== requiredTotal && (
          <p role="status" className="mt-3 text-sm text-amber-700">Section marks must total the required {requiredTotal} marks.</p>
        )}
        {total === requiredTotal && (mcqMarks % mcqCount !== 0 || structuredMarks % structuredCount !== 0) && (
          <p role="status" className="mt-3 text-sm text-amber-700">Each section's marks must divide evenly among its questions.</p>
        )}
        <label className="field-label mt-4">Additional instructions (optional)
          <textarea className="field-control min-h-20" maxLength={2000} value={prompt} onChange={(event) => setPrompt(event.target.value)} />
        </label>
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
        {gradeError && <p role="alert" className="mt-3 text-sm text-red-700">{gradeError}</p>}
        <button type="submit" className="button-primary mt-5" disabled={
          busy || total !== requiredTotal || mcqMarks % mcqCount !== 0 || structuredMarks % structuredCount !== 0
        }>
          <ClipboardCheck size={17} /> {busy ? "Generating paper and marking scheme..." : "Generate exam · KSh 15"}
        </button>
        {error.includes("Insufficient balance") && <a className="ml-3 text-sm text-teal-800 underline" href="/wallet">Go to wallet</a>}
      </form>
      {generated && <DocumentPreview id={generated.document.id} rawContent={generated.document.content} />}
    </>
  );
}
