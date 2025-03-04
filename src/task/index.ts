import { AbortionHandler } from '../abort.js';
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

  // for whatever reason, I need to type ah on every derived class
  public abstract run(ah: AbortionHandler): MaybePromise<void | Task[]>;

  /**
   * @returns reactive hash bijective to the task's subdivision
   */
  public abstract getSubdivisionHash(): ReactiveValue<any>;

  public abstract getCost(): ReactiveValue<number>;

  /**
   * @returns hash for task definition
   */
  public getHash(): string {
    return this.constructor.name;
  }

  public toString() {
    return this.getHash();
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

export function AvoidInfiniteRecursion(
  value?: typeof Infinity | ReactiveValue<typeof Infinity>
) {
  value ??= ReactiveValue.const(Infinity);

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

const cache = new Map<string, ReactiveValue<Task | undefined>>();
export function getLowestCostTask<T extends Task>(
  tasks: T[]
): ReactiveValue<T | undefined> {
  const costs = tasks.map((task) => task.getCost());

  const cacheKey = costs.map((cost) => cost.id).join(',');

  const cached = cache.get(cacheKey);
  if (cached !== undefined) return cached as ReactiveValue<T | undefined>;

  const result = ReactiveValue.compose(costs).derive((costs) => {
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

  cache.set(cacheKey, result as ReactiveValue<Task | undefined>);

  return result;
}
