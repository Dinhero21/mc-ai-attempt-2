import { OBTAIN_ITEM_CACHE_BASE_COST } from '../../settings.js';
import bot from '../../singleton/bot.js';
import Task from '../index.js';
import ObtainItemCraftingTask from './crafting.js';
import { ObtainItemMiningTask } from './mining.js';
import { ObtainItemPickingTask } from './picking.js';
import ObtainItemSmeltingTask from './smelting.js';

/**
 * obtain an item by any means necessary
 */
export default class ObtainItemTask extends Task {
  constructor(
    public readonly id: number,
    public readonly amount: number,
    stack: string[]
  ) {
    super(stack, `obtain-item:${id}`);
  }

  protected getTask():
    | ObtainItemMiningTask
    | ObtainItemCraftingTask
    | ObtainItemPickingTask
    | ObtainItemSmeltingTask
    | undefined {
    const tasks = [
      new ObtainItemPickingTask(this.id, this.stack),
      new ObtainItemCraftingTask(this.id, this.amount, this.stack),
      new ObtainItemMiningTask(this.id, this.amount, this.stack),
      new ObtainItemSmeltingTask(this.id, this.amount, this.stack),
    ];

    let bestTask: (typeof tasks)[number] | undefined;
    let bestCost = Infinity;

    for (const task of tasks) {
      const cost = task.getCost();

      if (cost < bestCost) {
        bestTask = task;
        bestCost = cost;
      }
    }

    return bestTask;
  }

  public async run() {
    if (bot.inventory.count(this.id, null) >= this.amount) return;

    const task = this.getTask();
    if (task === undefined) {
      console.warn('undefined task');
      return;
    }

    return [this, task];
  }

  @BaseCostWrapper(OBTAIN_ITEM_CACHE_BASE_COST)
  public getBaseCost() {
    const task = this.getTask();
    if (task === undefined) return Infinity;

    return task.getCost();
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

export function BaseCostWrapper(shouldCache: boolean) {
  const cache = new Map<number, number>();

  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const original = descriptor.value;

    // this can actually be other values
    // ObtainItem*Task would be more accurate
    descriptor.value = function (this: ObtainItemTask) {
      if (this.recursive) return Infinity;

      if (shouldCache) {
        const cachedValue = cache.get(this.id);
        if (cachedValue !== undefined) return cachedValue;
      }

      const value = original.call(this);

      if (shouldCache) cache.set(this.id, value);

      return value;
    };
  };
}
