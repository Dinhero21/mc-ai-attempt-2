import { Block } from 'prismarine-block';
import { Item } from 'prismarine-item';

import bot from '../singleton/bot.js';
import { toolIds } from '../tools.js';
import { DigBlockTask } from './dig-block.js';
import Task from './index.js';
import ObtainItemTask from './obtain-item/index.js';

/**
 * break a block using an appropriate tool
 */
export default class CollectBlockTask extends Task {
  constructor(public readonly block: Block, stack: string[]) {
    super(stack);
  }

  protected getTasks(): Task[] | undefined {
    const digTask = new DigBlockTask(this.block, this.stack);

    if (this.block.canHarvest(0)) {
      return [digTask];
    }

    let bestItem: Item | undefined;
    let bestDigTime = Infinity;

    for (const item of bot.inventory.items()) {
      if (!this.block.canHarvest(item.type)) continue;

      const digTime = this.block.digTime(item.type, false, false, false);

      if (digTime < bestDigTime) {
        bestItem = item;
        bestDigTime = digTime;
      }
    }

    if (bestItem !== undefined) {
      // TODO: Make this a task
      // (run at "inference" instead of "speculative")
      bot.equip(bestItem, 'hand');

      return [digTask];
    }

    let bestTask: ObtainItemTask | undefined;
    let bestCost = Infinity;

    for (const id of toolIds) {
      if (!this.block.canHarvest(id)) continue;

      const obtainTask = new ObtainItemTask(id, 1, this.stack);
      const cost = obtainTask.getCost();

      if (cost < bestCost) {
        bestTask = obtainTask;
        bestCost = cost;
      }
    }

    if (bestCost === Infinity) return;
    if (bestTask === undefined) return;

    return [bestTask, digTask];
  }

  public async run() {
    const tasks = this.getTasks();
    if (tasks === undefined) {
      console.warn('undefined tasks');
      return;
    }

    const task = tasks.shift();
    if (task === undefined) {
      console.warn('undefined task');
      return;
    }

    return [task];
  }

  public getCost() {
    if (this.recursive) return Infinity;

    const tasks = this.getTasks();

    if (tasks === undefined) return Infinity;

    return tasks.reduce((a, b) => a + b.getCost(), 0);
  }

  public toString() {
    return `${this.constructor.name}(${this.block.name})`;
  }
}
