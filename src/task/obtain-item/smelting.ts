import { recipesByType } from '../../recipes.js';
import { OBTAIN_ITEM_SMELTING_CACHE_BASE_COST } from '../../settings.js';
import bot from '../../singleton/bot.js';
import Task from '../index.js';
import SmeltItemTask from '../smelt-item.js';
import { BaseCostWrapper } from './index.js';

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
export default class ObtainItemSmeltingTask extends Task {
  constructor(
    public readonly id: number,
    public readonly amount: number,
    stack: string[]
  ) {
    super(stack);
  }

  public getTaskAndCost(): [SmeltItemTask, number] | undefined {
    const item = bot.registry.items[this.id];
    const name = item.name;
    const namespaced = `minecraft:${name}`;

    const recipes = recipesByResult.get(namespaced) ?? new Set();

    let bestTask: SmeltItemTask | undefined;
    let bestCost = Infinity;

    for (const namespaced of recipes) {
      const name = namespaced.startsWith('minecraft:')
        ? namespaced.slice('minecraft:'.length)
        : namespaced;
      const item = bot.registry.itemsByName[name];
      if (item === undefined) continue;

      const task = new SmeltItemTask(item.id, this.stack);
      const cost = task.getCost();

      if (cost < bestCost) {
        bestTask = task;
        bestCost = cost;
      }
    }

    if (bestCost === Infinity) return;
    if (bestTask === undefined) return;

    return [bestTask, bestCost];
  }

  public async run() {
    if (bot.inventory.count(this.id, null) >= this.amount) return;

    const taskAndCost = this.getTaskAndCost();
    if (taskAndCost === undefined) {
      console.warn('undefined task');
      return;
    }

    return [taskAndCost[0]];
  }

  @BaseCostWrapper(OBTAIN_ITEM_SMELTING_CACHE_BASE_COST)
  public getBaseCost() {
    const taskAndCost = this.getTaskAndCost();
    if (taskAndCost === undefined) return Infinity;

    return taskAndCost[1];
  }

  public getCost() {
    if (this.recursive) return Infinity;

    return (
      this.getBaseCost() *
      Math.max(this.amount - bot.inventory.count(this.id, null), 0)
    );
  }

  public toString() {
    const item = bot.registry.items[this.id];

    return `${this.constructor.name}(${item.name}×${this.amount})`;
  }
}
