import bot from '../../singleton/bot.js';
import Task from '../index.js';
import ObtainItemCraftingTask from './crafting.js';
import { ObtainItemMiningTask } from './mining.js';
import { ObtainItemPickingTask } from './picking.js';
import ObtainItemSmeltingTask from './smelting.js';

const cache = new Map<number, number>();

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

  protected _getBaseCost() {
    const task = this.getTask();
    if (task === undefined) return Infinity;

    return task.getCost();
  }

  public getBaseCost() {
    if (this.recursive) return Infinity;

    const cached = cache.get(this.id);
    if (cached !== undefined) return cached;

    const cost = this._getBaseCost();
    cache.set(this.id, cost);

    console.log(
      `BaseCost(Obtain(${bot.registry.items[this.id].name}))=${cost}`
    );

    return cost;
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
