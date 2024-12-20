import { ReactiveValue } from '../../react.js';
import { OBTAIN_ITEM_CRAFTING_USE_EXPECTED_VALUE } from '../../settings.js';
import bot from '../../singleton/bot.js';
import { getNearestBlock } from '../../world.js';
import CraftRecipeTask from '../craft-recipe.js';
import { AvoidInfiniteRecursion, CacheReactiveValue } from '../index.js';
import BaseObtainItemTask, { getLowestCostTaskAndCost } from './base.js';

/**
 * obtain an item by crafting it
 */
export default class ObtainItemCraftingTask extends BaseObtainItemTask {
  public static craftingTableBlock = getNearestBlock(
    bot.registry.blocksByName.crafting_table.id
  );

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(id: number, amount: number, stack: string[]) {
    super(id, amount, stack);
  }

  @CacheReactiveValue((task) => task.id)
  public getTaskAndCost(): ReactiveValue<
    [task: CraftRecipeTask, cost: number] | undefined
  > {
    return ObtainItemCraftingTask.craftingTableBlock
      .derive((craftingTable) => {
        const recipes = bot.recipesAll(this.id, null, craftingTable);

        const taskAndCostArray: ReactiveValue<
          [task: CraftRecipeTask, cost: number]
        >[] = recipes.map((recipe) => {
          const task = new CraftRecipeTask(recipe, this.stack);

          const reactiveCost = task.getCost();

          return reactiveCost.derive((cost) => {
            if (OBTAIN_ITEM_CRAFTING_USE_EXPECTED_VALUE)
              cost /= task.recipe.result.count;

            return [task, cost];
          });
        });

        const composed = ReactiveValue.compose(taskAndCostArray);

        return getLowestCostTaskAndCost(composed);
      })
      .flat();
  }

  @CacheReactiveValue((task) => task.id)
  public getTask(): ReactiveValue<CraftRecipeTask | undefined> {
    return this.getTaskAndCost().derive((taskAndCost) => taskAndCost?.[0]);
  }

  public async run() {
    const missing = this.getMissing();
    if (missing.value === 0) return;

    const reactiveTask = this.getTask();
    const task = reactiveTask.value;
    if (task === undefined) {
      console.warn('undefined task');
      return;
    }

    return [task];
  }

  @AvoidInfiniteRecursion()
  @CacheReactiveValue((task) => task.id)
  public getBaseCost(): ReactiveValue<number> {
    return this.getTaskAndCost().derive(
      (taskAndCost) => taskAndCost?.[1] ?? Infinity
    );
  }

  public toString() {
    const item = bot.registry.items[this.id];

    return `${this.constructor.name}(${item.name}×${this.amount})`;
  }
}
