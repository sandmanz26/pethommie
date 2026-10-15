/** A comparable outline of a copy object: same keys, same kinds of values, same array lengths. */
export function shapeOf(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(shapeOf);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, shapeOf(v)]),
    );
  }
  return typeof value;
}
