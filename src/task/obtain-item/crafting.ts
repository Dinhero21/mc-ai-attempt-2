import { OBTAIN_ITEM_CRAFTING_CACHE_BASE_COST } from '../../settings.js';
import bot from '../../singleton/bot.js';
import { findBlock } from '../../world.js';
import CraftRecipeTask from '../craft-recipe.js';
import Task from '../index.js';
import { BaseCostWrapper } from './index.js';

/**
 * obtain an item by crafting it
 */
export default class ObtainItemCraftingTask extends Task {
  constructor(
    public readonly id: number,
    public readonly amount: number,
    stack: string[]
  ) {
    super(stack);
  }

  public getTaskAndCost(): [CraftRecipeTask, number] | undefined {
    const craftingTable = findBlock(
      bot.registry.blocksByName.crafting_table.id
    );

    const recipes = bot.recipesAll(this.id, null, craftingTable);

    let bestTask: CraftRecipeTask | undefined;
    let bestCost = Infinity;

    for (const recipe of recipes) {
      const task = new CraftRecipeTask(recipe, this.stack);
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

  @BaseCostWrapper(OBTAIN_ITEM_CRAFTING_CACHE_BASE_COST)
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
