import { ArrowUpRight, Compass, Heart, Lightbulb, Telescope } from "lucide-react";
import PageHeading from "../../components/PageHeading";

const pathways = [
  { icon: Lightbulb, title: "Explore what inspires you", text: "Notice the subjects, questions and activities that make you curious." },
  { icon: Heart, title: "Connect interests to strengths", text: "Think about what you enjoy, what you do well and what you want to grow." },
  { icon: Compass, title: "Find your next step", text: "Use official guidance to explore senior school pathways and make an informed choice." },
];

export default function CareerPage(): React.ReactElement {
  return (
    <>
      <PageHeading
        eyebrow="FUTURE & CAREERS"
        title="Your future is full of possibilities."
        description="Explore your interests and learn about Kenya's senior school pathways with trusted guidance."
      />
      <section className="career-banner">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-teal-50">A GUIDE FOR WHAT'S NEXT</span>
          <h2 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">Big dreams begin with small discoveries.</h2>
          <p className="mt-3 max-w-xl leading-7 text-blue-100">There is more than one way to build a bright future. Take time to explore the things you care about and the paths that fit you.</p>
          <a className="button-light mt-6" href="https://selection-placement.kemis.go.ke/pathways?start=career" target="_blank" rel="noreferrer">
            Explore official pathways <ArrowUpRight size={16} />
          </a>
        </div>
        <Telescope aria-hidden="true" className="absolute -bottom-5 right-4 hidden h-48 w-48 text-white/10 sm:block" strokeWidth={1} />
      </section>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {pathways.map(({ icon: Icon, title, text }) => (
          <article className="panel-card" key={title}>
            <span className="icon-tile"><Icon size={20} /></span>
            <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
          </article>
        ))}
      </div>
    </>
  );
}
