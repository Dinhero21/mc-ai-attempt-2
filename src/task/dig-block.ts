import { Block } from 'prismarine-block';

import { GoalNear } from '../plugin/pathfinder.js';
import { ReactiveValue } from '../react.js';
import { DIG_BLOCK_BASE_COST } from '../settings.js';
import bot from '../singleton/bot.js';
import { getNearestBlock } from '../world.js';
import Task, { AvoidInfiniteRecursion, CacheReactiveValue } from './index.js';

/**
 * break a block using the currently selected item
 */
export class DigBlockTask extends Task {
  constructor(public readonly block: Block, stack: string[]) {
    super(stack);
  }

  public async run(): Promise<void> {
    const block = this.block;
    const pos = block.position;

    const goal = new GoalNear(pos.x, pos.y, pos.z, 1);

    await bot.pathfinder.goto(goal);

    const tool = bot.pathfinder.bestHarvestTool(block);
    if (tool !== null) bot.equip(tool, 'hand');

    await bot.dig(block);
  }

  protected cost = new ReactiveValue(DIG_BLOCK_BASE_COST);
  public getCost() {
    return this.cost;
  }

  public toString() {
    return `${this.constructor.name}(${this.block.name})`;
  }
}

export class DigBlockTypeTask extends Task {
  constructor(public readonly id: number, stack: string[]) {
    super(stack);
  }

  @CacheReactiveValue((task) => task.id)
  protected getTask(): ReactiveValue<DigBlockTask | undefined> {
    return getNearestBlock(this.id).derive((block) => {
      if (block === null) return;

      return new DigBlockTask(block, this.stack);
    });
  }

  public async run() {
    const reactiveTask = this.getTask();
    const task = reactiveTask.value;
    if (task === undefined) {
      console.warn('undefined task');
      return;
    }

    return [task];
  }

  @AvoidInfiniteRecursion()
  @CacheReactiveValue((task) => task.getTask().id)
  public getCost() {
    return this.getTask()
      .derive((task) => task?.getCost() ?? Infinity)
      .flat();
  }

  public toString() {
    const block = bot.registry.blocks[this.id];

    return `${this.constructor.name}(${block.name})`;
  }
}
