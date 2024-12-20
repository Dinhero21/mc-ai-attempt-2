import { Entity } from 'prismarine-entity';

import { GoalFollow } from '../../plugin/pathfinder.js';
import { ReactiveSet, ReactiveValue } from '../../react.js';
import {
  PICKING_ITEM_BASE_COST,
  PICKING_ITEM_INTERVAL_MS,
} from '../../settings.js';
import bot from '../../singleton/bot.js';
import Task, { AvoidInfiniteRecursion, CacheReactiveValue } from '../index.js';

// technically not an obtain item task, since it doesn't take amount as an input
/**
 * obtain an item by picking it up from the ground
 */
export class ObtainItemPickingTask extends Task {
  constructor(public readonly id: number, stack: string[]) {
    super(stack);
  }

  @CacheReactiveValue((task) => task.id)
  protected getEntity(): ReactiveValue<Entity | undefined> {
    const entities = new ReactiveSet<Entity>();

    bot.on('itemDrop', (entity) => {
      const item = entity.getDroppedItem();
      if (item === null) return;

      if (item.type === this.id) entities.add(entity);
    });

    bot.on('entityGone', (entity) => {
      entities.delete(entity);
    });

    return entities.derive((entities) => {
      let bestDistanceSquared = Infinity;
      let bestEntity: Entity | undefined;

      for (const entity of entities) {
        const distance = bot.entity.position.distanceSquared(entity.position);
        if (distance < bestDistanceSquared) {
          bestDistanceSquared = distance;
          bestEntity = entity;
        }
      }

      return bestEntity;
    });
  }

  public async run() {
    const reactiveEntity = this.getEntity();
    const entity = reactiveEntity.value;
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

  @AvoidInfiniteRecursion()
  @CacheReactiveValue((task) => task.id)
  public getCost() {
    const entity = this.getEntity();

    return entity.derive((entity) => {
      if (entity === undefined) return Infinity;

      return PICKING_ITEM_BASE_COST;
    });
  }

  public toString() {
    const item = bot.registry.items[this.id];

    return `${this.constructor.name}(${item.name})`;
  }
}
