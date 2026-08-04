export function AdminPlaceholder({ title }: Readonly<{ title: string }>) {
  return (
    <section aria-labelledby="section-title" className="space-y-3">
      <h1 id="section-title" className="text-3xl font-semibold tracking-tight">
        {title}
      </h1>
      <p className="text-slate-400">This workspace is planned for a later ticket.</p>
    </section>
  );
}
