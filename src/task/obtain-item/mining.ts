import { blockLootExpectedValueMap } from '../../extracted/loottable.js';
import { ReactiveValue } from '../../react.js';
import bot from '../../singleton/bot.js';
import { getNearestBlock } from '../../world.js';
import CollectBlockTask from '../collect-block.js';
import Task, { AvoidInfiniteRecursion, CacheReactiveValue } from '../index.js';
import BaseObtainItemTask, { getLowestCostTaskAndCost } from './base.js';

/**
 * obtain an item by mining a block
 */
export class ObtainItemMiningTask extends BaseObtainItemTask {
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(id: number, amount: number, stack: string[]) {
    super(id, amount, stack);
  }

  @CacheReactiveValue((task) => task.id)
  protected getTaskAndCost(): ReactiveValue<
    [task: CollectBlockTask, cost: number] | undefined
  > {
    const expectedValues = blockLootExpectedValueMap.get(this.id);
    if (expectedValues === undefined)
      return new ReactiveValue<
        [task: CollectBlockTask, cost: number] | undefined
      >(undefined);

    const taskAndCostArray: ReactiveValue<
      [task: CollectBlockTask, cost: number] | undefined
    >[] = Array.from(expectedValues.entries()).map(
      ([blockId, expectedValue]) => {
        const block = getNearestBlock(blockId);

        return block
          .derive((block) => {
            if (block === null) return undefined;

            const task = new CollectBlockTask(block, this.stack);
            const cost = task.getCost().derive((cost) => cost / expectedValue);

            return cost.derive(
              (cost) => [task, cost] as [task: CollectBlockTask, cost: number]
            );
          })
          .flat();
      }
    );

    const composed = ReactiveValue.compose(taskAndCostArray).derive((array) =>
      array.filter((value) => value !== undefined)
    );

    return getLowestCostTaskAndCost(composed);
  }

  @CacheReactiveValue((task) => task.getTaskAndCost().id)
  public getTask(): ReactiveValue<CollectBlockTask | undefined> {
    return this.getTaskAndCost().derive((taskAndCost) => taskAndCost?.[0]);
  }

  public async run(): Promise<void | Task[]> {
    const missing = this.getMissing();
    if (missing.value === 0) return;

    const reactiveTask = this.getTask();
    const task = reactiveTask.value;
    if (task === undefined) {
      console.warn('undefined task');
      return;
    }

    return [task];
  }

  @AvoidInfiniteRecursion()
  @CacheReactiveValue((task) => task.getTaskAndCost().id)
  protected getBaseCost() {
    return this.getTaskAndCost().derive(
      (taskAndCost) => taskAndCost?.[1] ?? Infinity
    );
  }

  public toString() {
    const item = bot.registry.items[this.id];

    return `${this.constructor.name}(${item.name}×${this.amount})`;
  }
}
