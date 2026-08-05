'use client';

import { createMapProvider } from '../../providers/map';
import type { MapCoordinate, MapProviderConfig } from '../../providers/map/types';
import { useEffect, useRef, useState } from 'react';

type SharedPlanMapMarker = Readonly<{
  coordinates: MapCoordinate;
  id: string;
  label: string;
}>;

type SharedPlanMapProps = Readonly<{
  config: MapProviderConfig;
  fallback: string;
  kind: 'fake' | 'maplibre';
  markers: readonly SharedPlanMapMarker[];
  title: string;
}>;

function boundsForMarkers(markers: readonly SharedPlanMapMarker[]) {
  if (markers.length === 0) {
    return { east: 10.7, north: 48.1, south: 47.1, west: 8.3 };
  }
  const latitudes = markers.map((marker) => marker.coordinates.latitude);
  const longitudes = markers.map((marker) => marker.coordinates.longitude);
  const north = Math.max(...latitudes);
  const south = Math.min(...latitudes);
  const east = Math.max(...longitudes);
  const west = Math.min(...longitudes);
  const latitudePadding = Math.max((north - south) * 0.15, 0.01);
  const longitudePadding = Math.max((east - west) * 0.15, 0.01);
  return {
    east: east + longitudePadding,
    north: north + latitudePadding,
    south: south - latitudePadding,
    west: west - longitudePadding,
  };
}

export function SharedPlanMap({ config, fallback, kind, markers, title }: SharedPlanMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const [providerFailed, setProviderFailed] = useState(false);
  const [providerAttribution, setProviderAttribution] = useState<string | null>(null);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const provider = createMapProvider(kind, config);
    let disposed = false;
    const unsubscribeError = provider.onError(() => {
      if (!disposed) setProviderFailed(true);
    });
    setProviderFailed(false);
    setProviderAttribution(provider.getAttribution().text);
    void provider
      .init(element)
      .then(() => {
        if (disposed) return;
        provider.fitBounds(boundsForMarkers(markers));
        provider.setMarkers(markers);
      })
      .catch(() => {
        if (!disposed) setProviderFailed(true);
      });
    return () => {
      disposed = true;
      unsubscribeError();
      provider.destroy();
    };
  }, [config, kind, markers]);

  return (
    <section aria-labelledby="shared-plan-map-heading" className="border border-slate-800 bg-slate-900/60 p-4">
      <h2 className="text-lg font-semibold text-white" id="shared-plan-map-heading">{title}</h2>
      {providerFailed ? (
        <p className="mt-3 text-sm text-amber-200">{fallback}</p>
      ) : (
        <div className="mt-3 min-h-48" ref={container} />
      )}
      {providerAttribution && !providerFailed ? <p className="mt-3 text-xs text-slate-500">{providerAttribution}</p> : null}
      <ol className="mt-4 grid gap-2 text-sm text-slate-400">
        {markers.map((marker, index) => (
          <li key={marker.id}>
            {index + 1}. {marker.label}
          </li>
        ))}
      </ol>
    </section>
  );
}
