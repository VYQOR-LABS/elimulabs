"use client";

import { useEffect, useState } from "react";

export interface CurriculumOption {
  id: string;
  name: string;
  strandId?: string;
  strandName?: string;
}

interface CurriculumState {
  areas: CurriculumOption[];
  strands: CurriculumOption[];
  subStrands: CurriculumOption[];
  loadingAreas: boolean;
  loadingStrands: boolean;
  error: string;
}

export function useCurriculum(grade: string, areaId: string): CurriculumState {
  const [areas, setAreas] = useState<CurriculumOption[]>([]);
  const [strands, setStrands] = useState<CurriculumOption[]>([]);
  const [subStrands, setSubStrands] = useState<CurriculumOption[]>([]);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [loadingStrands, setLoadingStrands] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!grade) {
      setAreas([]);
      return;
    }
    const controller = new AbortController();
    setLoadingAreas(true);
    setError("");
    fetch(`/api/curriculum/areas?grade=${encodeURIComponent(grade)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Could not load learning areas.");
        setAreas(body.learningAreas);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Could not load learning areas.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingAreas(false);
      });
    return () => controller.abort();
  }, [grade]);

  useEffect(() => {
    if (!areaId) {
      setStrands([]);
      setSubStrands([]);
      return;
    }
    const controller = new AbortController();
    setLoadingStrands(true);
    setError("");
    Promise.all([
      fetch(`/api/curriculum/strands?areaId=${encodeURIComponent(areaId)}`, { signal: controller.signal }),
      fetch(`/api/curriculum/sub-strands?areaId=${encodeURIComponent(areaId)}`, { signal: controller.signal }),
    ])
      .then(async ([strandsResponse, subStrandsResponse]) => {
        const [strandsBody, subStrandsBody] = await Promise.all([
          strandsResponse.json(),
          subStrandsResponse.json(),
        ]);
        if (!strandsResponse.ok || !subStrandsResponse.ok) {
          throw new Error("Could not load this learning area's curriculum.");
        }
        setStrands(strandsBody.strands);
        setSubStrands(subStrandsBody.subStrands);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Could not load curriculum.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingStrands(false);
      });
    return () => controller.abort();
  }, [areaId]);

  return { areas, strands, subStrands, loadingAreas, loadingStrands, error };
}
