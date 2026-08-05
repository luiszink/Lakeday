'use client';

type PrintPlanStop = Readonly<{
  address: string;
  arrival: string | null;
  duration: number | null;
  hours: string;
  name: string;
  url: string | null;
}>;

type PrintPlanSheetProps = Readonly<{
  date: string | null;
  locale: 'de' | 'en';
  startLabel: string | null;
  stops: readonly PrintPlanStop[];
  title: string;
  timestampLabel: string;
  unknownHoursLabel: string;
  visitLabel: string;
}>;

function printedDate(date: string | null, locale: 'de' | 'en') {
  if (!date) return null;
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'Europe/Zurich' }).format(
    new Date(`${date}T12:00:00.000Z`),
  );
}

function printedTimestamp(locale: 'de' | 'en') {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Zurich',
  }).format(new Date());
}

export function PrintPlanSheet({
  date,
  locale,
  startLabel,
  stops,
  title,
  timestampLabel,
  unknownHoursLabel,
  visitLabel,
}: PrintPlanSheetProps) {
  return (
    <section aria-labelledby="print-plan-title" className="print-plan-sheet">
      <header className="print-plan-header">
        <h1 id="print-plan-title">{title}</h1>
        <p>{date ? printedDate(date, locale) : unknownHoursLabel}</p>
        {startLabel ? <p>{startLabel}</p> : null}
        <p>{timestampLabel}: {printedTimestamp(locale)}</p>
      </header>
      <ol className="print-plan-stops">
        {stops.map((stop, index) => (
          <li className="print-plan-stop" key={`${stop.name}-${index}`}>
            <div className="print-plan-stop-heading">
              <strong>{index + 1}. {stop.name}</strong>
              {stop.arrival ? <span>{stop.arrival}</span> : null}
            </div>
            <p>{stop.address}</p>
            <p>{visitLabel}: {stop.duration ?? '-'} min · {stop.hours}</p>
            {stop.url ? <p>{stop.url}</p> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
