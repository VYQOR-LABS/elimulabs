import { FileText, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { Input, Select } from "../../components/Field";
import DocumentPreview from "../../components/DocumentPreview";
import PageHeading from "../../components/PageHeading";
import { useCurriculum } from "../../hooks/useCurriculum";
import { useGrades } from "../../hooks/useGrades";
import { apiJson, errorMessage, newRequestKey } from "../../lib/api";

const templates = [
  { type: "SCHEME_OF_WORK", name: "Schemes of Work", description: "Plan teaching across a term." },
  { type: "LESSON_PLAN", name: "Lesson Plan", description: "Shape a focused, engaging lesson." },
  { type: "RECORDS_OF_WORK", name: "Records of Work", description: "Keep track of teaching progress." },
] as const;

type DocumentKind = (typeof templates)[number]["type"];
interface GeneratedResult {
  document: { id: string; title: string; content: string };
  balance: number;
}

export default function DocumentsPage(): React.ReactElement {
  const [kind, setKind] = useState<DocumentKind | "">("");
  const [grade, setGrade] = useState("");
  const [areaId, setAreaId] = useState("");
  const [strandId, setStrandId] = useState("");
  const [subStrandId, setSubStrandId] = useState("");
  const [selectedSubStrands, setSelectedSubStrands] = useState<string[]>([]);
  const [term, setTerm] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [weeks, setWeeks] = useState("14");
  const [lessonsPerWeek, setLessonsPerWeek] = useState("5");
  const [halfTermWeek, setHalfTermWeek] = useState("");
  const [objectives, setObjectives] = useState("");
  const [lessonDetails, setLessonDetails] = useState("");
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<GeneratedResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const busyRef = useRef(false);
  const requestKey = useRef("");
  const requestFingerprint = useRef("");
  const { areas, strands, subStrands, loadingAreas, loadingStrands, error: curriculumError } =
    useCurriculum(grade, areaId);
  const { grades, error: gradeError } = useGrades();

  function chooseTemplate(type: DocumentKind): void {
    setKind(type);
    setResult(null);
    setError("");
    requestKey.current = "";
    requestFingerprint.current = "";
    setSelectedSubStrands([]);
  }

  function toggleSubStrand(id: string): void {
    setSelectedSubStrands((selected) =>
      selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id],
    );
  }

  async function generate(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!kind || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    setResult(null);
    const shared = { type: kind, grade: Number(grade), areaId, prompt };
    const body = kind === "SCHEME_OF_WORK"
      ? {
          ...shared,
          year: Number(year),
          term,
          weeks: Number(weeks),
          lessonsPerWeek: Number(lessonsPerWeek),
          halfTermWeek: halfTermWeek ? Number(halfTermWeek) : null,
          subStrandIds: selectedSubStrands,
        }
      : kind === "RECORDS_OF_WORK"
        ? { ...shared, year: Number(year), term, subStrandIds: selectedSubStrands }
        : { ...shared, strandId, subStrandId, objectives, lessonDetails };
    const fingerprint = JSON.stringify(body);
    if (requestFingerprint.current !== fingerprint) {
      requestKey.current = newRequestKey();
      requestFingerprint.current = fingerprint;
    }

    try {
      const generated = await apiJson<GeneratedResult>("/api/generate", {
        method: "POST",
        headers: { "idempotency-key": requestKey.current },
        body: JSON.stringify(body),
      });
      setResult(generated);
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
        eyebrow="TEACHER TOOLKIT"
        title="Make room for great teaching."
        description="Build professional teaching documents with your selected curriculum content and instructions."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {templates.map((template, index) => (
          <button
            type="button"
            key={template.type}
            onClick={() => chooseTemplate(template.type)}
            className={`document-choice ${kind === template.type ? "document-choice-selected" : ""}`}
          >
            <span className="document-number">0{index + 1}</span>
            <span className="mt-5 block font-semibold text-slate-900">{template.name}</span>
            <span className="mt-1 block text-sm leading-6 text-slate-500">{template.description}</span>
          </button>
        ))}
      </div>
      {kind && (
        <form className="panel-card mt-5" onSubmit={generate}>
          <div className="mb-5 flex items-center gap-3">
            <span className="icon-tile"><FileText size={20} /></span>
            <div>
              <h2 className="font-semibold text-slate-900">
                Generate {templates.find((template) => template.type === kind)?.name}
              </h2>
              <p className="text-sm text-slate-500">KSh 20 · Charged only after a validated document is created</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Select label="Grade" id="document-grade" required value={grade} onChange={(event) => {
              setGrade(event.target.value);
              setAreaId("");
              setStrandId("");
              setSubStrandId("");
              setSelectedSubStrands([]);
            }}>
              <option value="">Select grade</option>
              {grades.map((value) => <option key={value} value={value}>Grade {value}</option>)}
            </Select>
            <Select label="Learning area" id="document-area" required value={areaId} disabled={!grade || loadingAreas} onChange={(event) => {
              setAreaId(event.target.value);
              setStrandId("");
              setSubStrandId("");
              setSelectedSubStrands([]);
            }}>
              <option value="">{loadingAreas ? "Loading areas..." : "Select learning area"}</option>
              {areas.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </Select>
            {kind !== "LESSON_PLAN" && (
              <>
                <Select label="Term" id="document-term" required value={term} onChange={(event) => setTerm(event.target.value)}>
                  <option value="">Select term</option>
                  {[1, 2, 3].map((value) => <option key={value}>Term {value}</option>)}
                </Select>
                <Input label="Year" id="document-year" type="number" min="2020" max="2100" required value={year} onChange={(event) => setYear(event.target.value)} />
              </>
            )}
            {kind === "SCHEME_OF_WORK" && (
              <>
                <Select label="Teaching weeks" id="document-weeks" required value={weeks} onChange={(event) => {
                  setWeeks(event.target.value);
                  if (Number(halfTermWeek) > Number(event.target.value)) setHalfTermWeek("");
                }}>
                  {Array.from({ length: 24 }, (_, i) => i + 1).map((value) => <option key={value} value={value}>{value} weeks</option>)}
                </Select>
                <Input label="Lessons per week" id="lessons-per-week" type="number" min="1" max="20" required value={lessonsPerWeek} onChange={(event) => setLessonsPerWeek(event.target.value)} />
                <Select label="Half-term week" id="half-term-week" value={halfTermWeek} onChange={(event) => setHalfTermWeek(event.target.value)}>
                  <option value="">No half-term week</option>
                  {Array.from({ length: Number(weeks) }, (_, i) => i + 1).map((value) => <option key={value} value={value}>Week {value} (excluded)</option>)}
                </Select>
              </>
            )}
            {kind === "LESSON_PLAN" && (
              <>
                <Select label="Strand" id="document-strand" required value={strandId} disabled={!areaId || loadingStrands} onChange={(event) => { setStrandId(event.target.value); setSubStrandId(""); }}>
                  <option value="">Select strand</option>
                  {strands.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </Select>
                <Select label="Sub-strand" id="document-sub-strand" required value={subStrandId} disabled={!strandId} onChange={(event) => setSubStrandId(event.target.value)}>
                  <option value="">Select sub-strand</option>
                  {subStrands.filter((item) => item.strandId === strandId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </Select>
              </>
            )}
          </div>
          {(kind === "SCHEME_OF_WORK" || kind === "RECORDS_OF_WORK") && areaId && (
            <fieldset className="mt-5">
              <legend className="mb-2 text-sm font-semibold text-slate-800">Choose curriculum content</legend>
              {loadingStrands ? <p className="text-sm text-slate-500">Loading strands...</p> : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {subStrands.map((item) => (
                    <label className="flex items-start gap-2 rounded-lg border border-slate-200 p-3 text-sm text-slate-700" key={item.id}>
                      <input type="checkbox" checked={selectedSubStrands.includes(item.id)} onChange={() => toggleSubStrand(item.id)} />
                      <span>{item.strandName}: {item.name}</span>
                    </label>
                  ))}
                  {!subStrands.length && !loadingStrands && <p className="text-sm text-slate-500">No curriculum content is available for this learning area yet.</p>}
                </div>
              )}
            </fieldset>
          )}
          {kind === "LESSON_PLAN" && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="field-label">Learning objectives
                <textarea className="field-control min-h-28" required value={objectives} onChange={(event) => setObjectives(event.target.value)} />
              </label>
              <label className="field-label">Lesson details
                <textarea className="field-control min-h-28" required value={lessonDetails} onChange={(event) => setLessonDetails(event.target.value)} />
              </label>
            </div>
          )}
          <label className="field-label mt-4">Additional instructions (optional)
            <textarea className="field-control min-h-24" maxLength={2000} value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Teaching approach, classroom activities, or other guidance..." />
          </label>
          {(gradeError || curriculumError) && <p role="alert" className="mt-3 text-sm text-red-700">{gradeError || curriculumError}</p>}
          {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
          <button type="submit" className="button-primary mt-5" disabled={busy || (kind !== "LESSON_PLAN" && !selectedSubStrands.length)}>
            <Sparkles size={17} /> {busy ? "Generating..." : "Generate document · KSh 20"}
          </button>
          {error.includes("Insufficient balance") && <a className="ml-3 text-sm text-teal-800 underline" href="/wallet">Go to wallet</a>}
        </form>
      )}
      {result && <DocumentPreview id={result.document.id} rawContent={result.document.content} />}
    </>
  );
}
