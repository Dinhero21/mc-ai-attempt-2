import { Block } from 'prismarine-block';

import { GoalNear } from '../plugin/pathfinder.js';
import bot from '../singleton/bot.js';
import Task from './index.js';

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

    await bot.dig(block);
  }

  public getCost() {
    return 1;
  }

  public toString() {
    return `${this.constructor.name}(${this.block.name})`;
  }
}

export class DigBlockTypeTask extends Task {
  constructor(public readonly id: number, stack: string[]) {
    super(stack);
  }

  protected getTask(): DigBlockTask | undefined {
    const block = bot.findBlock({
      matching: this.id,
    });

    if (block === null) return;

    return new DigBlockTask(block, this.stack);
  }

  public async run() {
    const task = this.getTask();

    if (task === undefined) {
      console.warn('undefined task');
      return;
    }

    return [task];
  }

  public getCost() {
    if (this.recursive) return Infinity;

    const task = this.getTask();

    if (task === undefined) return Infinity;

    return task.getCost();
  }

  public toString() {
    const block = bot.registry.blocks[this.id];

    return `${this.constructor.name}(${block.name})`;
  }
}
