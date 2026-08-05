import { Locale } from '@lake/db';

import { database } from '../../auth/database';

export async function listUserReports() {
  return database.userReport.findMany({
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      attractionId: true,
      category: true,
      message: true,
      locale: true,
      status: true,
      createdAt: true,
      attraction: {
        select: {
          localizations: {
            where: { locale: Locale.en },
            take: 1,
            select: { name: true, slug: true },
          },
        },
      },
    },
  });
}
