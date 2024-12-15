import { Recipe } from 'prismarine-recipe';

import { GoalNear } from '../plugin/pathfinder.js';
import bot from '../singleton/bot.js';
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
    const task = tasks[0];
    if (task !== undefined) return [this, task];

    const craftingTable = bot.findBlock({
      matching: bot.registry.blocksByName.crafting_table.id,
    });

    if (craftingTable !== null) {
      const goal = new GoalNear(
        craftingTable.position.x,
        craftingTable.position.y,
        craftingTable.position.z,
        3
      );

      await bot.pathfinder.goto(goal);
    }

    await bot.craft(this.recipe, 1, craftingTable ?? undefined);
  }

  public getCost() {
    if (this.recursive) return Infinity;

    const tasks = this.getTasks();

    return tasks.map((task) => task.getCost()).reduce((a, b) => a + b, 0) + 1;
  }

  public toString() {
    const result = this.recipe.result;
    const item = bot.registry.items[result.id];

    return `${this.constructor.name}(${item.name}×${result.count})`;
  }
}
