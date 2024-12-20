import { recipesByType } from '../../extracted/recipes.js';
import { ReactiveValue } from '../../react.js';
import bot from '../../singleton/bot.js';
import {
  AvoidInfiniteRecursion,
  CacheReactiveValue,
  getLowestCostTask,
} from '../index.js';
import SmeltItemTask from '../smelt-item.js';
import BaseObtainItemTask from './base.js';

const recipes = recipesByType.get('minecraft:smelting');

if (recipes === undefined) {
  throw new Error(`could not load minecraft:smelting recipes`);
}

const recipesByResult = new Map<string, Set<string>>();

for (const recipe of recipes as Set<any>) {
  const set = recipesByResult.get(recipe.result) ?? new Set();
  recipesByResult.set(recipe.result, set);

  const ingredient = recipe.ingredient;

  if (Array.isArray(ingredient)) {
    if ('item' in ingredient) set.add(ingredient.item as string);
    // TODO: tag parsing

    continue;
  }

  if ('item' in ingredient) set.add(ingredient.item);
}

/**
 * obtain an item by smelting
 *
 * @warning does not attempt to create a furnace
 */
export default class ObtainItemSmeltingTask extends BaseObtainItemTask {
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(id: number, amount: number, stack: string[]) {
    super(id, amount, stack);
  }

  // here we don't have to use taskAndCost since cost is always the task's cost
  // (since an item is always smelted from a single item)
  public getTask(): ReactiveValue<SmeltItemTask | undefined> {
    const item = bot.registry.items[this.id];
    const name = item.name;
    const namespaced = `minecraft:${name}`;

    const recipes = recipesByResult.get(namespaced) ?? new Set();

    const tasks: SmeltItemTask[] = Array.from(recipes)
      .map((namespaced) => {
        const name = namespaced.startsWith('minecraft:')
          ? namespaced.slice('minecraft:'.length)
          : namespaced;
        const item = bot.registry.itemsByName[name];
        if (item === undefined) return;

        const task = new SmeltItemTask(item.id, this.stack);

        return task;
      })
      .filter((task) => task !== undefined);

    return getLowestCostTask(tasks);
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
  @CacheReactiveValue((target) => target.id)
  public getBaseCost() {
    return this.getTask()
      .derive((task) => task?.getCost() ?? Infinity)
      .flat();
  }

  public toString() {
    const item = bot.registry.items[this.id];

    return `${this.constructor.name}(${item.name}×${this.amount})`;
  }
}
