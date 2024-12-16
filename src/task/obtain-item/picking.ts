import { Entity } from 'prismarine-entity';

import { GoalFollow } from '../../plugin/pathfinder.js';
import {
  PICKING_ITEM_BASE_COST,
  PICKING_ITEM_INTERVAL_MS,
} from '../../settings.js';
import bot from '../../singleton/bot.js';
import Task from '../index.js';

/**
 * obtain an item by picking it up from the ground
 */
export class ObtainItemPickingTask extends Task {
  constructor(public readonly id: number, stack: string[]) {
    super(stack);
  }

  protected getEntity(): Entity | undefined {
    return (
      bot.nearestEntity((entity) => {
        if (entity.name !== 'item') return false;

        const item = entity.metadata[8];
        if (item === undefined)
          throw new Error(`could not parse item entity metadata`);

        return item.present === true && item.itemId === this.id;
      }) ?? undefined
    );
  }

  public async run() {
    const entity = this.getEntity();
    if (entity === undefined) {
      console.warn('undefined entity');
      return;
    }

    // I should probably use setGoal and then a custom Promise to wait for the item to be picked up

    const goal = new GoalFollow(entity, 0);

    const interval = setInterval(() => {
      // entity has been removed
      if (!entity.isValid) {
        if (bot.pathfinder.goal === goal) bot.pathfinder.stop();
      }
    }, PICKING_ITEM_INTERVAL_MS);

    await bot.pathfinder.goto(goal).catch(() => {});

    clearInterval(interval);
  }

  public getCost() {
    if (this.recursive) return Infinity;

    const entity = this.getEntity();
    if (entity === undefined) return Infinity;

    return PICKING_ITEM_BASE_COST;
  }

  public toString() {
    const item = bot.registry.items[this.id];

    return `${this.constructor.name}(${item.name})`;
  }
}
