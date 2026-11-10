import { BookOpen, ClipboardList, Download, FileText } from "lucide-react";
import PageHeading from "../../components/PageHeading";

const prices = [
  { name: "View a resource", price: "KSh 5", icon: BookOpen },
  { name: "Download resource as PDF", price: "KSh 10", icon: Download },
  { name: "Download resource as Word", price: "KSh 10", icon: Download },
  { name: "Scheme of Work", price: "KSh 20", icon: FileText },
  { name: "Lesson Plan", price: "KSh 20", icon: FileText },
  { name: "Records of Work", price: "KSh 20", icon: FileText },
  { name: "Exam & marking scheme", price: "KSh 15", icon: ClipboardList },
];

export default function AboutPage(): React.ReactElement {
  return (
    <>
      <PageHeading
        eyebrow="ABOUT ELIMULABS"
        title="Tools for every step of learning."
        description="ElimuLabs brings learning resources, teacher planning, assessment and career guidance together in one friendly place."
      />
      <section className="panel-card">
        <div className="grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div>
            <span className="brand-mark">E</span>
            <h2 className="mt-4 text-2xl font-bold text-slate-950">Learning made more accessible</h2>
            <p className="mt-3 leading-7 text-slate-600">We want useful education tools to feel straightforward and welcoming—for learners finding their way and teachers preparing for the classroom.</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-5">
            <p className="eyebrow">OUR PURPOSE</p>
            <p className="mt-2 text-lg font-medium leading-7 text-slate-800">Learn with curiosity. Create with confidence. Prepare for what comes next.</p>
          </div>
        </div>
      </section>
      <div className="mb-4 mt-9">
        <p className="eyebrow">SIMPLE & AFFORDABLE</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-950">Pricing at a glance</h2>
        <p className="mt-2 text-sm text-slate-600">These prices are applied by the server to successful operations only.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {prices.map(({ name, price, icon: Icon }) => (
          <article key={name} className="price-card">
            <span className="icon-tile"><Icon size={19} /></span>
            <p className="mt-4 text-sm text-slate-600">{name}</p>
            <p className="mt-1 text-2xl font-bold text-slate-950">{price}</p>
          </article>
        ))}
      </div>
    </>
  );
}
