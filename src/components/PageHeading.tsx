interface PageHeadingProps {
  eyebrow: string;
  title: string;
  description: string;
}

export default function PageHeading({
  eyebrow,
  title,
  description,
}: PageHeadingProps): React.ReactElement {
  return (
    <div className="mb-7 max-w-2xl">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 text-base leading-7 text-slate-600">{description}</p>
    </div>
  );
}
