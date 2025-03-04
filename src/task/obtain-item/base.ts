import { getReactiveItemCountForId } from '../../inventory.js';
import { ReactiveValue } from '../../react.js';
import Task, { AvoidInfiniteRecursion, CacheReactiveValue } from '../index.js';

export default abstract class BaseObtainItemTask extends Task {
  constructor(
    public readonly id: number,
    public readonly amount: number,
    stack: string[],
    stackId?: string
  ) {
    super(stack, stackId);
  }

  @CacheReactiveValue((task) => `${task.id},${task.amount}`)
  protected getMissing(): ReactiveValue<number> {
    return getReactiveItemCountForId(this.id).derive((itemCount) =>
      Math.max(this.amount - itemCount, 0)
    );
  }

  @AvoidInfiniteRecursion()
  @CacheReactiveValue(
    // really, it should be `${task.getBaseCost().id},${task.getMissing().id}`, but we don't know the value of getBaseCost yet
    // ? should I include task.constructor.name
    (task) => `${task.constructor.name}(${task.id}x${task.amount})`
  )
  public getCost(): ReactiveValue<number> {
    if (!('getBaseCost' in this)) {
      throw new TypeError(
        `ObtainItemMethodTask.getCost called with no ${this.constructor.name}.getBaseCost implementation`
      );

      // if (!('getTask' in this)) {
      //   throw new TypeError(
      //     `ObtainItemMethodTask.getCost called with no ${this.constructor.name}.getBaseCost or ${this.constructor.name}.getTask implementation`
      //   );
      // }

      // if (typeof this.getTask !== 'function') {
      //   throw new TypeError(
      //     `ObtainItemMethodTask.getCost called with invalid ${this.constructor.name}.getTask implementation`
      //   );
      // }

      // const task = this.getTask();

      // if (!(task instanceof ReactiveValue))
      //   throw new TypeError(
      //     `expected ReactiveValue, got (type=${typeof task}, constructor.name=${
      //       task?.constructor.name
      //     }, stringified=${task})`
      //   );

      // return task.derive((task) => task?.getCost() ?? Infinity).flat();
    }

    if (typeof this.getBaseCost !== 'function') {
      throw new TypeError(
        `ObtainItemMethodTask.getBaseCost called with invalid ${this.constructor.name}.getBaseCost implementation`
      );
    }

    const baseCost = this.getBaseCost();

    if (!(baseCost instanceof ReactiveValue))
      throw new TypeError(
        `expected ReactiveValue, got (type=${typeof baseCost}, constructor.name=${
          baseCost?.constructor.name
        }, stringified=${baseCost})`
      );

    const missing = this.getMissing();

    return ReactiveValue.compose([baseCost, missing]).derive(
      // to avoid Infinity * 0
      ([baseCost, missing]) => (missing === 0 ? 0 : baseCost * missing)
    );
  }
}

const cache = new Map<
  number,
  ReactiveValue<[task: Task, cost: number] | undefined>
>();
export function getLowestCostTaskAndCost<T extends Task>(
  taskAndCosts: ReactiveValue<[task: T, cost: number][]>
): ReactiveValue<[task: T, cost: number] | undefined> {
  const cached = cache.get(taskAndCosts.id);
  if (cached !== undefined)
    return cached as ReactiveValue<[task: T, cost: number] | undefined>;

  const result: ReactiveValue<[task: T, cost: number] | undefined> =
    taskAndCosts.derive((taskAndCosts) => {
      let bestTask: T | undefined;
      let bestCost = Infinity;

      for (const [task, cost] of taskAndCosts) {
        if (Number.isNaN(cost)) throw new Error(`${task}_Cost is NaN`);

        if (cost < bestCost) {
          bestTask = task;
          bestCost = cost;
        }
      }

      if (bestTask === undefined) return;
      if (bestCost === Infinity) return;

      return [bestTask, bestCost];
    });

  cache.set(
    taskAndCosts.id,
    result as ReactiveValue<[task: Task, cost: number] | undefined>
  );

  return result;
}
