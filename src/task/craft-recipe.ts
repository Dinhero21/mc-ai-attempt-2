import { Recipe } from 'prismarine-recipe';

import { GoalNear } from '../plugin/pathfinder.js';
import {
  CRAFT_RECIPE_BASE_COST,
  CRAFT_RECIPE_CRAFTING_TABLE_DISTANCE,
  CRAFT_RECIPE_OBTAIN_INGREDIENT_ORDER,
} from '../settings.js';
import bot from '../singleton/bot.js';
import { findBlock } from '../world.js';
import Task from './index.js';
import ObtainItemTask from './obtain-item/index.js';

/**
 * craft a recipe
 *
 * @warning does not attempt to create a crafting table
 */
export default class CraftRecipeTask extends Task {
  constructor(public readonly recipe: Recipe, stack: string[]) {
    super(stack);
  }

  protected getTasks(): ObtainItemTask[] {
    const ingredientCount = new Map<number, number>();

    for (const ingredient of this.recipe.ingredients ??
      this.recipe.inShape.flat()) {
      if (ingredient.id === -1) continue;

      ingredientCount.set(
        ingredient.id,
        // for whatever reason, ingredient counts are sometimes reversed
        (ingredientCount.get(ingredient.id) ?? 0) + Math.abs(ingredient.count)
      );
    }

    return Array.from(ingredientCount.entries())
      .filter(([id, count]) => bot.inventory.count(id, null) < count)
      .map(([id, count]) => new ObtainItemTask(id, count, this.stack));
  }

  public async run() {
    const tasks = this.getTasks();

    let task: Task | undefined;

    switch (CRAFT_RECIPE_OBTAIN_INGREDIENT_ORDER) {
      case 'arbitrary:first':
        task = tasks[0];
        break;
      case 'arbitrary:random':
        task = tasks[Math.floor(Math.random() * tasks.length)];
        break;
      case 'cost:highest':
        {
          let bestTask: Task | undefined;
          let bestCost: number = -Infinity;

          for (const task of tasks) {
            const cost = task.getCost();

            if (cost > bestCost) {
              bestCost = cost;
              bestTask = task;
            }
          }

          task = bestTask;
        }

        break;
      case 'cost:lowest':
        {
          let bestTask: Task | undefined;
          let bestCost: number = Infinity;

          for (const task of tasks) {
            const cost = task.getCost();

            if (cost > bestCost) {
              bestCost = cost;
              bestTask = task;
            }
          }

          task = bestTask;
        }

        break;
    }

    if (task !== undefined) return [this, task];

    const craftingTable = findBlock(
      bot.registry.blocksByName.crafting_table.id
    );

    if (craftingTable !== null) {
      const goal = new GoalNear(
        craftingTable.position.x,
        craftingTable.position.y,
        craftingTable.position.z,
        CRAFT_RECIPE_CRAFTING_TABLE_DISTANCE
      );

      await bot.pathfinder.goto(goal);
    }

    await bot.craft(this.recipe, 1, craftingTable ?? undefined);
  }

  public getCost() {
    if (this.recursive) return Infinity;

    const tasks = this.getTasks();

    return (
      tasks.map((task) => task.getCost()).reduce((a, b) => a + b, 0) +
      CRAFT_RECIPE_BASE_COST
    );
  }

  public toString() {
    const result = this.recipe.result;
    const item = bot.registry.items[result.id];

    return `${this.constructor.name}(${item.name}×${result.count})`;
  }
}
