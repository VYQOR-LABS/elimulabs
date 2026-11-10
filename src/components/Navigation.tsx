import {
  BookOpen,
  ClipboardList,
  CreditCard,
  FileText,
  GraduationCap,
  History,
  Info,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { SectionId } from "../types";

const links: { id: SectionId; label: string; icon: LucideIcon }[] = [
  { id: "resources", label: "Resources", icon: BookOpen },
  { id: "documents", label: "Teacher tools", icon: FileText },
  { id: "exam", label: "Exam studio", icon: ClipboardList },
  { id: "career", label: "Career paths", icon: GraduationCap },
  { id: "about", label: "About", icon: Info },
  { id: "history", label: "Activity", icon: History },
  { id: "wallet", label: "Wallet", icon: CreditCard },
];

interface NavigationProps {
  active: SectionId;
}

export default function Navigation({ active }: NavigationProps): React.ReactElement {
  return (
    <nav aria-label="Main navigation" className="nav-scroll">
      <div className="flex w-full gap-1 px-4 sm:px-7">
        {links.map(({ id, label, icon: Icon }) => (
          <Link
            key={id}
            href={`/${id}`}
            aria-current={active === id ? "page" : undefined}
            className={`nav-item ${active === id ? "nav-item-active" : ""}`}
          >
            <Icon size={17} strokeWidth={1.8} />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
