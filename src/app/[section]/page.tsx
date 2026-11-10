import { notFound } from "next/navigation";
import SiteApp from "../../components/SiteApp";
import type { SectionId } from "../../types";

const sections: SectionId[] = [
  "resources",
  "documents",
  "exam",
  "career",
  "about",
  "history",
  "wallet",
];

export default async function SectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}): Promise<React.ReactElement> {
  const { section } = await params;
  if (!sections.includes(section as SectionId)) notFound();
  return <SiteApp initialSection={section as SectionId} />;
}
