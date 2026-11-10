import { BookOpenCheck, Download, RotateCcw } from "lucide-react";
import { useRef, useState } from "react";
import { useCurriculum } from "../../hooks/useCurriculum";
import { useGrades } from "../../hooks/useGrades";
import { apiJson, errorMessage, newRequestKey } from "../../lib/api";
import { Select } from "../../components/Field";
import PageHeading from "../../components/PageHeading";

interface ViewedResource {
  id: string;
  title: string;
  content: string;
}

export default function ResourcesPage(): React.ReactElement {
  const [grade, setGrade] = useState("");
  const [areaId, setAreaId] = useState("");
  const [strandId, setStrandId] = useState("");
  const [subStrandId, setSubStrandId] = useState("");
  const [resource, setResource] = useState<ViewedResource | null>(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const busyRef = useRef(false);
  const viewKey = useRef("");
  const viewFingerprint = useRef("");
  const pdfKey = useRef("");
  const docxKey = useRef("");
  const [downloaded, setDownloaded] = useState<string[]>([]);
  const { areas, strands, subStrands, loadingAreas, loadingStrands, error } =
    useCurriculum(grade, areaId);
  const { grades, error: gradeError } = useGrades();
  const selectedSubStrand = subStrands.find((item) => item.id === subStrandId);

  function clearResource(): void {
    setResource(null);
    setDownloaded([]);
    viewKey.current = "";
    viewFingerprint.current = "";
    pdfKey.current = "";
    docxKey.current = "";
    setMessage("");
  }

  function reset(): void {
    setGrade("");
    setAreaId("");
    setStrandId("");
    setSubStrandId("");
    clearResource();
  }

  async function viewResource(): Promise<void> {
    if (!subStrandId || busyRef.current || resource) return;
    busyRef.current = true;
    if (viewFingerprint.current !== subStrandId) {
      viewKey.current = newRequestKey();
      viewFingerprint.current = subStrandId;
    }
    setBusy("view");
    setMessage("");
    try {
      const result = await apiJson<{ resource: { id: string; title: string; content: string } }>(
        "/api/resources/view",
        {
          method: "POST",
          headers: { "idempotency-key": viewKey.current },
          body: JSON.stringify({ subStrandId }),
        },
      );
      setResource(result.resource);
    } catch (cause) {
      setMessage(errorMessage(cause));
    } finally {
      busyRef.current = false;
      setBusy("");
    }
  }

  async function downloadResource(format: "pdf" | "docx"): Promise<void> {
    if (!resource || busyRef.current || downloaded.includes(format)) return;
    busyRef.current = true;
    const key = format === "pdf" ? pdfKey : docxKey;
    if (!key.current) key.current = newRequestKey();
    setBusy(format);
    setMessage("");
    try {
      const response = await fetch(
        `/api/resources/${resource.id}/download?format=${format}`,
        { method: "POST", headers: { "idempotency-key": key.current } },
      );
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "The download could not be completed.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${resource.title.replace(/[^a-z0-9_-]+/gi, "-")}.${format}`;
      anchor.click();
      URL.revokeObjectURL(url);
      setDownloaded((previous) => [...previous, format]);
    } catch (cause) {
      setMessage(errorMessage(cause));
    } finally {
      busyRef.current = false;
      setBusy("");
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="LEARNING & TEACHING NOTES"
        title="A little learning goes a long way."
        description="Find available resources by grade, learning area and curriculum strand."
      />
      <section className="panel-card">
        <div className="mb-6 flex items-start gap-3">
          <span className="icon-tile"><BookOpenCheck size={21} /></span>
          <div>
            <h2 className="font-semibold text-slate-900">Explore learning resources</h2>
            <p className="mt-1 text-sm text-slate-500">Each choice narrows the available curriculum options.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select label="Grade" id="grade" value={grade} onChange={(event) => {
            setGrade(event.target.value);
            setAreaId("");
            setStrandId("");
            setSubStrandId("");
            clearResource();
          }}>
            <option value="">Select grade</option>
            {grades.map((value) => (
              <option key={value} value={value}>Grade {value}</option>
            ))}
          </Select>
          <Select label="Learning area" id="learning-area" value={areaId} disabled={!grade || loadingAreas} onChange={(event) => {
            setAreaId(event.target.value);
            setStrandId("");
            setSubStrandId("");
            clearResource();
          }}>
            <option value="">{loadingAreas ? "Loading areas..." : "Select learning area"}</option>
            {areas.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Select>
          <Select label="Strand" id="strand" value={strandId} disabled={!areaId || loadingStrands} onChange={(event) => {
            setStrandId(event.target.value);
            setSubStrandId("");
            clearResource();
          }}>
            <option value="">{loadingStrands ? "Loading strands..." : "Select strand"}</option>
            {strands.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Select>
          <Select label="Sub-strand" id="sub-strand" value={subStrandId} disabled={!strandId || loadingStrands} onChange={(event) => {
            setSubStrandId(event.target.value);
            clearResource();
          }}>
            <option value="">Select sub-strand</option>
            {subStrands.filter((item) => item.strandId === strandId).map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </Select>
        </div>
        {(gradeError || error) && <p role="alert" className="mt-4 text-sm text-red-700">{gradeError || error}</p>}
        {areaId && !loadingStrands && !strands.length && (
          <p className="mt-4 text-sm text-slate-500">No curriculum strands have been added for this learning area yet.</p>
        )}
        {areaId && strandId && !loadingStrands && !subStrands.some((item) => item.strandId === strandId) && (
          <p className="mt-4 text-sm text-slate-500">No sub-strands are available for this strand yet.</p>
        )}
        <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row">
          <button type="button" className="button-primary" onClick={viewResource} disabled={!subStrandId || Boolean(busy) || Boolean(resource)}>
            <BookOpenCheck size={17} /> {busy === "view" ? "Loading resource..." : resource ? "Resource viewed" : "View resource · KSh 5"}
          </button>
          <button type="button" className="button-secondary" onClick={reset} disabled={Boolean(busy)}>
            <RotateCcw size={16} /> Reset
          </button>
          {resource && (
            <div className="flex flex-col gap-2 sm:ml-auto sm:flex-row">
              <button type="button" className="button-secondary" onClick={() => downloadResource("pdf")} disabled={Boolean(busy) || downloaded.includes("pdf")}>
                <Download size={16} /> {busy === "pdf" ? "Preparing..." : downloaded.includes("pdf") ? "PDF downloaded" : "PDF · KSh 10"}
              </button>
              <button type="button" className="button-secondary" onClick={() => downloadResource("docx")} disabled={Boolean(busy) || downloaded.includes("docx")}>
                <Download size={16} /> {busy === "docx" ? "Preparing..." : downloaded.includes("docx") ? "Word downloaded" : "Word · KSh 10"}
              </button>
            </div>
          )}
        </div>
        {message && <p role="status" className="mt-4 text-sm text-amber-800">{message}</p>}
      </section>
      {resource && (
        <article className="panel-card mt-5 print-content">
          <p className="eyebrow">{areas.find((item) => item.id === areaId)?.name} · Grade {grade}</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">{resource.title}</h2>
          <p className="mt-1 text-sm text-slate-500">{strands.find((item) => item.id === strandId)?.name} / {selectedSubStrand?.name}</p>
          <div className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-700">{resource.content}</div>
        </article>
      )}
    </>
  );
}
