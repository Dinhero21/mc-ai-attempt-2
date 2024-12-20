import { Recipe } from 'prismarine-recipe';

import { getReactiveItemCountForId } from '../inventory.js';
import { GoalNear } from '../plugin/pathfinder.js';
import { ReactiveValue } from '../react.js';
import {
  CRAFT_RECIPE_BASE_COST,
  CRAFT_RECIPE_CRAFTING_TABLE_DISTANCE,
  CRAFT_RECIPE_OBTAIN_INGREDIENT_ORDER,
} from '../settings.js';
import bot from '../singleton/bot.js';
import { getNearestBlock } from '../world.js';
import Task, { AvoidInfiniteRecursion, CacheReactiveValue } from './index.js';
import ObtainItemTask from './obtain-item/index.js';

/**
 * craft a recipe
 *
 * @warning does not attempt to create a crafting table
 */
export default class CraftRecipeTask extends Task {
  protected readonly ingredientCount: Map<number, number>;

  constructor(public readonly recipe: Recipe, stack: string[]) {
    super(stack);

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

    this.ingredientCount = ingredientCount;
  }

  @CacheReactiveValue((task) => task.recipe)
  protected getTasks(): ReactiveValue<ObtainItemTask[]> {
    const tasks = Array.from(this.ingredientCount.entries()).map(
      ([id, count]) => new ObtainItemTask(id, count, this.stack)
    );

    const reactiveTaskArray = tasks.map((task) =>
      getReactiveItemCountForId(task.id).derive((count) =>
        count < task.amount ? task : undefined
      )
    );

    return ReactiveValue.compose(reactiveTaskArray).derive((array) =>
      array.filter((value) => value !== undefined)
    );
  }

  public async run(): Promise<void | Task[]> {
    const reactiveTasks = this.getTasks();
    const tasks = reactiveTasks.value;

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
            const reactiveCost = task.getCost();
            const cost = reactiveCost.value;

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
            const reactiveCost = task.getCost();
            const cost = reactiveCost.value;

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

    const reactiveCraftingTable = getNearestBlock(
      bot.registry.blocksByName.crafting_table.id
    );
    const craftingTable = reactiveCraftingTable.value;

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

  @AvoidInfiniteRecursion()
  @CacheReactiveValue((task) => task.recipe)
  public getCost() {
    const tasks = this.getTasks();

    return tasks
      .derive((tasks) => {
        const costs = tasks.map((task) => task.getCost());

        return ReactiveValue.compose(costs).derive((costs) =>
          costs.reduce((a, b) => a + b, CRAFT_RECIPE_BASE_COST)
        );
      })
      .flat();
  }

  public toString() {
    const result = this.recipe.result;
    const item = bot.registry.items[result.id];

    return `${this.constructor.name}({ ${Array.from(
      this.ingredientCount.entries()
    )
      .map(([id, count]) => `${bot.registry.items[id]?.name}×${count}`)
      .join(', ')} } -> ${item.name}×${result.count})`;
  }
}
