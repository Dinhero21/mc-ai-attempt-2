import { getReactiveItemCountForId } from '../../inventory.js';
import { ReactiveValue } from '../../react.js';
import bot from '../../singleton/bot.js';
import Task, {
  AvoidInfiniteRecursion,
  CacheReactiveValue,
  getLowestCostTask,
} from '../index.js';
import BaseObtainItemTask from './base.js';
import ObtainItemCraftingTask from './crafting.js';
import { ObtainItemMiningTask } from './mining.js';
import { ObtainItemPickingTask } from './picking.js';
import ObtainItemSmeltingTask from './smelting.js';

/**
 * obtain an item by any means necessary
 */
export default class ObtainItemTask extends BaseObtainItemTask {
  constructor(id: number, amount: number, stack: string[]) {
    super(id, amount, stack, `obtain-item:${id}`);
  }

  @CacheReactiveValue((task) => `${task.id}x${task.amount}`)
  protected getTask(): ReactiveValue<Task | undefined> {
    return getLowestCostTask([
      new ObtainItemPickingTask(this.id, this.stack),
      new ObtainItemCraftingTask(this.id, this.amount, this.stack),
      new ObtainItemMiningTask(this.id, this.amount, this.stack),
      new ObtainItemSmeltingTask(this.id, this.amount, this.stack),
    ]) as ReactiveValue<Task | undefined>;
  }

  @CacheReactiveValue((task) => `${task.id},${task.amount}`)
  protected getMissing(): ReactiveValue<number> {
    return getReactiveItemCountForId(this.id).derive((itemCount) =>
      Math.max(this.amount - itemCount, 0)
    );
  }

  public run(): void | Task[] {
    const missing = this.getMissing();
    if (missing.value === 0) return;

    const reactiveTask = this.getTask();
    const task = reactiveTask.value;
    if (task === undefined) {
      console.warn('undefined task');
      return;
    }

    return [this, task];
  }

  @AvoidInfiniteRecursion()
  @CacheReactiveValue((task) => task.getTask().id)
  public getCost(): ReactiveValue<number> {
    const task = this.getTask();

    return task.derive((task) => task?.getCost() ?? Infinity).flat();
  }

  public toString() {
    const item = bot.registry.items[this.id];

    return `${this.constructor.name}(${item.name}×${this.amount})`;
  }
}
