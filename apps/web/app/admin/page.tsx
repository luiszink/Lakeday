import Link from 'next/link';

export default function AdminHomePage() {
  return (
    <section aria-labelledby="admin-title" className="space-y-4">
      <p className="text-sm font-medium text-cyan-400">Admin workspace</p>
      <h1 id="admin-title" className="text-3xl font-semibold tracking-tight">
        Content operations
      </h1>
      <p className="max-w-2xl text-slate-400">
        Choose a workspace area to continue managing the attraction database.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          className="rounded-md border border-slate-800 bg-slate-900 p-4 hover:border-cyan-500"
          href="/admin/attractions"
        >
          Attractions
        </Link>
        <Link
          className="rounded-md border border-slate-800 bg-slate-900 p-4 hover:border-cyan-500"
          href="/admin/review-queue"
        >
          Review queue
        </Link>
        <Link
          className="rounded-md border border-slate-800 bg-slate-900 p-4 hover:border-cyan-500"
          href="/admin/import"
        >
          Import
        </Link>
        <Link
          className="rounded-md border border-slate-800 bg-slate-900 p-4 hover:border-cyan-500"
          href="/admin/registries"
        >
          Registries
        </Link>
        <Link
          className="rounded-md border border-slate-800 bg-slate-900 p-4 hover:border-cyan-500"
          href="/admin/reports"
        >
          Reports
        </Link>
      </div>
    </section>
  );
}
