import { notFound } from 'next/navigation';

import { requireRole } from '../../../src/auth/admin-guard';
import { listUserReports } from '../../../src/admin/reports/repository';

export const runtime = 'nodejs';

export default async function AdminReportsPage() {
  if (!(await requireRole('REVIEWER'))) notFound();
  const reports = await listUserReports();

  return (
    <section aria-labelledby="reports-title" className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight" id="reports-title">
          Reports
        </h1>
        <p className="mt-2 text-slate-400">
          Anonymous visitor reports. Triage and proposal creation happen in the review workflow.
        </p>
      </div>
      {reports.length === 0 ? (
        <p className="rounded-md border border-slate-800 bg-slate-900 p-5 text-slate-400">
          No reports received.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-slate-800">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <caption className="sr-only">Anonymous visitor reports</caption>
            <thead className="bg-slate-900 text-slate-300">
              <tr>
                <th className="px-4 py-3 font-semibold" scope="col">
                  Attraction
                </th>
                <th className="px-4 py-3 font-semibold" scope="col">
                  Category
                </th>
                <th className="px-4 py-3 font-semibold" scope="col">
                  Message
                </th>
                <th className="px-4 py-3 font-semibold" scope="col">
                  Locale
                </th>
                <th className="px-4 py-3 font-semibold" scope="col">
                  Status
                </th>
                <th className="px-4 py-3 font-semibold" scope="col">
                  Received
                </th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr className="border-t border-slate-800" key={report.id}>
                  <td className="px-4 py-3 text-slate-200">
                    {report.attraction.localizations[0]?.name ?? report.attractionId}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{report.category}</td>
                  <td className="max-w-md whitespace-pre-wrap px-4 py-3 text-slate-300">
                    {report.message ?? 'No message'}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{report.locale}</td>
                  <td className="px-4 py-3 text-slate-300">{report.status}</td>
                  <td className="px-4 py-3 text-slate-400">{report.createdAt.toISOString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
