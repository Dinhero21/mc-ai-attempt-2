type InternalDimensionalMap<K extends any[], V> = K extends [
  infer Head,
  ...infer Rest
]
  ? Map<Head, InternalDimensionalMap<Rest, V>>
  : V;

/**
 * @warning expects K to always be of the same length, may lead to undefined behavior (errors or invalid values) if not
 */
export class DimensionalMap<K extends any[], V> {
  private readonly map = new Map() as InternalDimensionalMap<K, V>;

  public get(keys: K, excludeLastValuePopulation: boolean = true): V {
    let value: InternalDimensionalMap<K, V> = this.map;

    for (const [i, key] of keys.entries()) {
      if (!(value instanceof Map))
        throw new RangeError(`keys too big, got ${keys.length}, expected ${i}`);

      let newValue = value.get(key);
      if (
        newValue === undefined &&
        (!excludeLastValuePopulation || i !== keys.length - 1)
      ) {
        newValue = new Map();
        value.set(key, newValue);
      }

      value = newValue;
    }

    return value as V;
  }

  public set(keys: K, value: V): void {
    const map = this.get(keys.slice(0, -1) as K, false) as Map<K[keyof K], V>;

    map.set(keys[keys.length - 1], value);
  }
}
