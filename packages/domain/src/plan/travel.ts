import { haversineDistanceM } from '../relevance.js';

export type TravelMode = 'WALK' | 'BICYCLE' | 'CAR' | 'PUBLIC_TRANSPORT';

export type TravelPoint = Readonly<{
  latitude: number;
  longitude: number;
}>;

export type TravelEstimatorConfig = Readonly<{
  detourFactor: number;
  modeSpeedKmh: Readonly<Record<TravelMode, number>>;
  publicTransportWaitMinutes: number;
}>;

export interface TravelTimeEstimator {
  estimate(from: TravelPoint, to: TravelPoint, mode: TravelMode): number;
}

export const defaultTravelEstimatorConfig: TravelEstimatorConfig = Object.freeze({
  detourFactor: 1.3,
  modeSpeedKmh: Object.freeze({
    BICYCLE: 14,
    CAR: 45,
    PUBLIC_TRANSPORT: 25,
    WALK: 4.5,
  }),
  publicTransportWaitMinutes: 10,
});

export class HeuristicTravelTimeEstimator implements TravelTimeEstimator {
  private readonly config: TravelEstimatorConfig;

  constructor(
    config: Readonly<{
      detourFactor?: number;
      modeSpeedKmh?: Partial<Record<TravelMode, number>>;
      publicTransportWaitMinutes?: number;
    }> = {},
  ) {
    this.config = {
      ...defaultTravelEstimatorConfig,
      ...config,
      modeSpeedKmh: {
        ...defaultTravelEstimatorConfig.modeSpeedKmh,
        ...config.modeSpeedKmh,
      },
    };
  }

  estimate(from: TravelPoint, to: TravelPoint, mode: TravelMode) {
    const distanceKm = haversineDistanceM(from, to) / 1_000;
    const minutes = (distanceKm * this.config.detourFactor * 60) / this.config.modeSpeedKmh[mode];
    return Math.max(0, Math.ceil(minutes + (mode === 'PUBLIC_TRANSPORT' ? this.config.publicTransportWaitMinutes : 0)));
  }
}