import { setTimeout as sleep } from 'timers/promises';

import { GoalNear } from '../plugin/pathfinder.js';
import {
  SMELT_ITEM_BASE_COST,
  SMELT_ITEM_FUEL_ITEM_NAME,
  SMELT_ITEM_INTERVAL_MS,
} from '../settings.js';
import bot from '../singleton/bot.js';
import { getNearestBlock } from '../world.js';
import Task, { AvoidInfiniteRecursion, ReactiveInfinity } from './index.js';
import ObtainItemTask from './obtain-item/index.js';

const FUEL_ID = bot.registry.itemsByName[SMELT_ITEM_FUEL_ITEM_NAME].id;

/**
 * smelt an item
 *
 * @warning does not attempt to create a furnace
 */
export default class SmeltItemTask extends Task {
  public static furnaceBlock = getNearestBlock(
    bot.registry.blocksByName.furnace.id
  );

  /**
   * @param id id of the item to be smelted
   */
  constructor(public readonly id: number, stack: string[]) {
    super(stack);
  }

  public async run() {
    const reactiveBlock = SmeltItemTask.furnaceBlock;
    const block = reactiveBlock.value;
    if (block === null) {
      console.warn('null furnace');
      return;
    }

    const goal = new GoalNear(
      block.position.x,
      block.position.y,
      block.position.z,
      3
    );
    await bot.pathfinder.goto(goal);

    const furnace = await bot.openFurnace(block);

    const output = await (async () => {
      while (true) {
        await sleep(SMELT_ITEM_INTERVAL_MS);

        if (furnace.outputItem() !== null) {
          await furnace.takeOutput().catch(console.warn);
          return;
        }

        if (
          (furnace.progress === 0 || furnace.progress === null) &&
          furnace.inputItem()?.type !== this.id
        ) {
          if (furnace.inputItem() !== null) await furnace.takeInput();

          if (bot.inventory.count(this.id, null) === 0) {
            return [this, new ObtainItemTask(this.id, 1, this.stack)];
          }

          await furnace.putInput(this.id, null, 1).catch(console.warn);
        }

        if (
          (furnace.fuel === 0 || furnace.fuel === null) &&
          furnace.fuelItem() === null
        ) {
          if (bot.inventory.count(FUEL_ID, null) === 0) {
            return [this, new ObtainItemTask(FUEL_ID, 1, this.stack)];
          }

          await furnace.putFuel(FUEL_ID, null, 1).catch(console.warn);
        }
      }
    })();

    furnace.close();

    return output;
  }

  @AvoidInfiniteRecursion()
  public getCost() {
    return SmeltItemTask.furnaceBlock
      .derive((block) => {
        if (block === null) return ReactiveInfinity;

        // We can't synchronously fetch furnace data, so we gotta approximate
        const task = new ObtainItemTask(this.id, 1, this.stack);
        return task.getCost().derive((cost) => cost + SMELT_ITEM_BASE_COST);
      })
      .flat();
  }

  public toString() {
    const item = bot.registry.items[this.id];

    return `${this.constructor.name}(${item.name})`;
  }
}
