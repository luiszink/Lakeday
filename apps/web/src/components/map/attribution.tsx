import type { MapAttribution } from '../../providers/map/types';

type MapAttributionProps = Readonly<{
  attribution: MapAttribution;
}>;

export function MapAttribution({ attribution }: MapAttributionProps) {
  return (
    <p className="text-xs text-slate-500">
      {attribution.text} ·{' '}
      <a
        className="underline decoration-slate-600 underline-offset-2 hover:text-slate-300"
        href={attribution.openStreetMapUrl}
        rel="noreferrer"
        target="_blank"
      >
        © OpenStreetMap contributors
      </a>
      {attribution.providerUrl ? (
        <>
          {' · '}
          <a
            className="underline decoration-slate-600 underline-offset-2 hover:text-slate-300"
            href={attribution.providerUrl}
            rel="noreferrer"
            target="_blank"
          >
            {attribution.providerName}
          </a>
        </>
      ) : (
        <> · {attribution.providerName}</>
      )}
    </p>
  );
}
