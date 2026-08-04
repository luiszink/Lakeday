import { CountryCode, PrismaClient } from '@prisma/client';

type HolidayCalendarSeed = Readonly<{
  code: 'DE-BW' | 'CH-TG' | 'CH-SH' | 'AT-VBG';
  name: string;
  countryCode: CountryCode;
  subdivision: string;
  dates: ReadonlyArray<string>;
}>;

// Sources: https://www.service-bw.de/zufi/leistungen/6006353 and https://www.feiertage-schweiz.ch/
// Vorarlberg: https://vorarlberg.at/-/gesetzliche-feiertage
const holidayCalendars: ReadonlyArray<HolidayCalendarSeed> = [
  {
    code: 'DE-BW',
    name: 'Baden-Württemberg',
    countryCode: CountryCode.DE,
    subdivision: 'BW',
    dates: [
      '2026-01-01',
      '2026-01-06',
      '2026-04-03',
      '2026-04-06',
      '2026-05-01',
      '2026-05-14',
      '2026-05-25',
      '2026-06-04',
      '2026-10-03',
      '2026-11-01',
      '2026-12-25',
      '2026-12-26',
      '2027-01-01',
      '2027-01-06',
      '2027-03-26',
      '2027-03-29',
      '2027-05-01',
      '2027-05-06',
      '2027-05-17',
      '2027-05-27',
      '2027-10-03',
      '2027-11-01',
      '2027-12-25',
      '2027-12-26',
    ],
  },
  {
    code: 'CH-TG',
    name: 'Thurgau',
    countryCode: CountryCode.CH,
    subdivision: 'TG',
    dates: [
      '2026-01-01',
      '2026-04-03',
      '2026-04-06',
      '2026-05-01',
      '2026-05-14',
      '2026-08-01',
      '2026-12-25',
      '2026-12-26',
      '2027-01-01',
      '2027-03-26',
      '2027-03-29',
      '2027-05-01',
      '2027-05-06',
      '2027-08-01',
      '2027-12-25',
      '2027-12-26',
    ],
  },
  {
    code: 'CH-SH',
    name: 'Schaffhausen',
    countryCode: CountryCode.CH,
    subdivision: 'SH',
    dates: [
      '2026-01-01',
      '2026-01-02',
      '2026-04-03',
      '2026-04-06',
      '2026-05-01',
      '2026-05-14',
      '2026-08-01',
      '2026-12-25',
      '2026-12-26',
      '2027-01-01',
      '2027-01-02',
      '2027-03-26',
      '2027-03-29',
      '2027-05-01',
      '2027-05-06',
      '2027-08-01',
      '2027-12-25',
      '2027-12-26',
    ],
  },
  {
    code: 'AT-VBG',
    name: 'Vorarlberg',
    countryCode: CountryCode.AT,
    subdivision: 'VBG',
    dates: [
      '2026-01-01',
      '2026-01-06',
      '2026-04-06',
      '2026-05-01',
      '2026-05-14',
      '2026-05-25',
      '2026-06-04',
      '2026-08-15',
      '2026-10-26',
      '2026-11-01',
      '2026-12-08',
      '2026-12-25',
      '2026-12-26',
      '2027-01-01',
      '2027-01-06',
      '2027-03-29',
      '2027-05-01',
      '2027-05-06',
      '2027-05-17',
      '2027-05-27',
      '2027-08-15',
      '2027-10-26',
      '2027-11-01',
      '2027-12-08',
      '2027-12-25',
      '2027-12-26',
    ],
  },
];

export async function seedHolidayCalendars(client: PrismaClient): Promise<void> {
  for (const { code, name, countryCode, subdivision } of holidayCalendars) {
    await client.holidayCalendar.upsert({
      where: { code },
      create: { code, name, countryCode, subdivision },
      update: { name, countryCode, subdivision },
    });
  }
}

export function isPublicHoliday(calendarCode: HolidayCalendarSeed['code'], date: string): boolean {
  return holidayCalendars.find(({ code }) => code === calendarCode)?.dates.includes(date) ?? false;
}

export const holidayCalendarCodes = holidayCalendars.map(({ code }) => code);
