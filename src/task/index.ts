import { ReactiveValue } from '../react.js';

type MaybePromise<T> = T | Promise<T>;

export default abstract class Task {
  protected readonly recursive: boolean;
  protected readonly stack: string[];

  constructor(stack: string[], id?: string) {
    if (id === undefined) {
      this.recursive = false;
      this.stack = stack;
    } else {
      this.recursive = stack.includes(id);
      this.stack = stack.concat(id);
    }
  }

  public abstract run(): MaybePromise<void | Task[]>;
  // public abstract stop(): void;

  public abstract getCost(): ReactiveValue<number>;

  public toString() {
    return this.constructor.name;
  }
}

export function CacheReactiveValue<T, U, V /* extends ReactiveValue */>(
  getId: (target: T) => U
) {
  const cache = new Map<U, V>();

  return function (
    target: T,
    propertyKey: keyof any,
    descriptor: PropertyDescriptor
  ) {
    const original = descriptor.value as unknown;

    if (typeof original !== 'function')
      throw new TypeError(`expected function, got ${typeof original}`);

    descriptor.value = function (this: T) {
      const id = getId(this);

      const cachedValue = cache.get(id);
      if (cachedValue !== undefined) return cachedValue;

      const value = original.call(this) as V;
      cache.set(id, value);

      return value;
    };
  };
}

export const ReactiveInfinity = new ReactiveValue<typeof Infinity>(Infinity);
export function AvoidInfiniteRecursion(
  value?: typeof Infinity | typeof ReactiveInfinity
) {
  value ??= ReactiveInfinity;

  return function AvoidInfiniteRecursion(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const original = descriptor.value;

    if (typeof original !== 'function')
      throw new TypeError(`expected function, got ${typeof original}`);

    descriptor.value = function (this: any) {
      if (this.recursive) return value;

      return original.call(this);
    };
  };
}

export function getLowestCostTask<T extends Task>(
  tasks: T[]
): ReactiveValue<T | undefined> {
  const costs = tasks.map((task) => task.getCost());

  return ReactiveValue.compose(costs).derive((costs) => {
    let bestCost = Infinity;
    let bestTask: T | undefined;

    for (const [index, cost] of costs.entries()) {
      if (Number.isNaN(cost)) throw new Error(`${tasks[index]}_Cost is NaN`);

      if (cost < bestCost) {
        bestCost = cost;
        bestTask = tasks[index];
      }
    }

    return bestTask;
  });
}
