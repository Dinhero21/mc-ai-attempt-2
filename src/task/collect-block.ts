import { Block } from 'prismarine-block';

import { itemCount } from '../inventory.js';
import { ReactiveValue } from '../react.js';
import { toolIds } from '../tools.js';
import { DigBlockTask } from './dig-block.js';
import Task, { AvoidInfiniteRecursion, getLowestCostTask } from './index.js';
import ObtainItemTask from './obtain-item/index.js';

/**
 * break a block using an appropriate tool
 */
export default class CollectBlockTask extends Task {
  constructor(public readonly block: Block, stack: string[]) {
    super(stack);
  }

  protected getTasks(): ReactiveValue<Task[] | undefined> {
    const digTask = new DigBlockTask(this.block, this.stack);

    if (this.block.canHarvest(0)) {
      return new ReactiveValue<Task[] | undefined>([digTask]);
    }

    const canAlreadyHarvest: ReactiveValue<boolean> = itemCount.derive(
      (itemCount) => {
        for (const [id, count] of itemCount.entries()) {
          if (count <= 0) continue;
          if (!this.block.canHarvest(id)) continue;

          return true;
        }

        return false;
      }
    );

    // ? Should I place this inside of outside canHarvest
    const tasks = toolIds
      .filter((id) => this.block.canHarvest(id))
      .map((id) => new ObtainItemTask(id, 1, this.stack));
    // ? Should I place this inside of outside canHarvest
    const bestTask = getLowestCostTask(tasks);

    return ReactiveValue.compose([canAlreadyHarvest, bestTask]).derive(
      ([canAlreadyHarvest, bestTask]) => {
        if (canAlreadyHarvest) return [digTask];

        if (bestTask === undefined) return;

        return [bestTask, digTask];
      }
    ) as ReactiveValue<Task[] | undefined>;
  }

  public async run() {
    const reactiveTasks = this.getTasks();
    const tasks = reactiveTasks.value;
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

  @AvoidInfiniteRecursion()
  public getCost() {
    const tasks = this.getTasks();
    return tasks
      .derive((tasks) => {
        if (tasks === undefined) return Infinity;

        const reactiveCostArray = tasks.map((task) => task.getCost());
        const composed = ReactiveValue.compose(reactiveCostArray);

        return composed.derive((costs) => costs.reduce((a, b) => a + b, 0));
      })
      .flat();
  }

  public toString() {
    return `${this.constructor.name}(${this.block.name})`;
  }
}
