import { blockLootExpectedValueMap } from '../../loottable.js';
import { OBTAIN_ITEM_MINING_CACHE_BASE_COST } from '../../settings.js';
import bot from '../../singleton/bot.js';
import { findBlock } from '../../world.js';
import CollectBlockTask from '../collect-block.js';
import Task from '../index.js';
import { BaseCostWrapper } from './index.js';

/**
 * obtain an item by mining a block
 */
export class ObtainItemMiningTask extends Task {
  constructor(
    public readonly id: number,
    public readonly amount: number,
    stack: string[]
  ) {
    super(stack);
  }

  protected getTaskAndCost(): [CollectBlockTask, number] | undefined {
    const expectedValues = blockLootExpectedValueMap.get(this.id);

    if (expectedValues === undefined) return;

    let bestTask: CollectBlockTask | undefined;
    let bestCost = Infinity;

    for (const [blockId, expectedValue] of expectedValues) {
      const block = findBlock(blockId);
      if (block === null) continue;

      const task = new CollectBlockTask(block, this.stack);

      const cost = task.getCost() / expectedValue;

      if (cost < bestCost) {
        bestTask = task;
        bestCost = cost;
      }
    }

    if (bestTask === undefined) return;

    return [bestTask, bestCost];
  }

  public async run() {
    if (bot.inventory.count(this.id, null) >= this.amount) return;

    const taskAndCost = this.getTaskAndCost();
    if (taskAndCost === undefined) {
      console.warn('undefined task');
      return;
    }

    return [taskAndCost[0]];
  }

  @BaseCostWrapper(OBTAIN_ITEM_MINING_CACHE_BASE_COST)
  protected getBaseCost() {
    const taskAndCost = this.getTaskAndCost();
    if (taskAndCost === undefined) return Infinity;

    return taskAndCost[1];
  }

  public getCost() {
    if (this.recursive) return Infinity;

    return (
      this.getBaseCost() *
      Math.max(this.amount - bot.inventory.count(this.id, null), 0)
    );
  }

  public toString() {
    const item = bot.registry.items[this.id];

    return `${this.constructor.name}(${item.name}×${this.amount})`;
  }
}
