export const filterKeys = [
  'age',
  'audience',
  'cafe',
  'cat',
  'dogs',
  'dur',
  'food',
  'heat',
  'interest',
  'io',
  'lang',
  'mode',
  'near',
  'noresv',
  'open',
  'picnic',
  'price',
  'r',
  'rain',
  'region',
  'season',
  'stroller',
  'wheelchair',
] as const;

export type FilterKey = (typeof filterKeys)[number];
export type FilterState = Partial<Record<FilterKey, string>>;

export function readFilterState(queryString: string): FilterState {
  const parameters = new URLSearchParams(queryString);
  const state: FilterState = {};
  for (const key of filterKeys) {
    const value = parameters.get(key);
    if (value) state[key] = value;
  }
  return state;
}

export function writeFilterState(state: FilterState): string {
  const parameters = new URLSearchParams();
  for (const key of filterKeys) {
    const value = state[key];
    if (value) parameters.set(key, value);
  }
  return parameters.toString();
}

export function toggleFilterValue(state: FilterState, key: FilterKey, value: string): FilterState {
  const values = new Set((state[key] ?? '').split(',').filter(Boolean));
  if (values.has(value)) values.delete(value);
  else values.add(value);
  const nextState = { ...state };
  if (values.size === 0) delete nextState[key];
  else nextState[key] = [...values].join(',');
  return nextState;
}

export function countActiveFilters(state: FilterState): number {
  return filterKeys.reduce((count, key) => {
    if (!state[key] || key === 'near') return count;
    return (
      count +
      (key === 'r' || key === 'rain' || key === 'heat' || key === 'open'
        ? 1
        : state[key]!.split(',').length)
    );
  }, 0);
}
