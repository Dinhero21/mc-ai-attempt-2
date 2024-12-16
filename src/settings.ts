// Increasing this might reduce CPU load (although not by much, since heuristic calculation is the bulk of the work)
// Decreasing this might lead to faster execution, but, if it is lower than the server's ping, the bot could take decisions based on outdated information, which could lead to erroneous actions (such as taking the same action twice)
export const TASK_SLEEP_DELAY_MS = 10;

export const SMELT_ITEM_INTERVAL_MS = 100;

export const PICKING_ITEM_INTERVAL_MS = 100;

// arbitrary:first is slightly faster than arbitrary:random
// cost:* should be measurably slower than arbitrary:*
// there _might_ be a (time) advantage to using a cost-based order instead of something arbitrary
// TODO: Test ^
export const CRAFT_RECIPE_OBTAIN_INGREDIENT_ORDER:
  | 'arbitrary:first'
  | 'arbitrary:random'
  | 'cost:highest'
  | 'cost:lowest' = 'arbitrary:first';

// Increasing this number could lead to less movement
// Decrease if the bot is unable to interact with blocks
const INTERACTION_DISTANCE = 3;

export const CRAFT_RECIPE_CRAFTING_TABLE_DISTANCE = INTERACTION_DISTANCE;
export const SMELT_ITEM_FURNACE_DISTANCE = INTERACTION_DISTANCE;

export const CRAFT_RECIPE_BASE_COST = 0.5;
export const DIG_BLOCK_BASE_COST = 1;
export const SMELT_ITEM_BASE_COST = 2;
export const PICKING_ITEM_BASE_COST = 0.5;

// Disable if not OP
export const DEBUG_VISUALS = true;

export const SMELT_ITEM_FUEL_ITEM_NAME = 'coal';

// none is measurably faster than cost-delta, however, it _may_ lead to erroneous decisions based on outdated information
// full recalculates the entire stack after each action, as such, it is extremely slow
export const STACK_PRUNING_METHOD: 'none' | 'cost-delta' | 'full' =
  'cost-delta';

export const OBTAIN_ITEM_CACHE_BASE_COST = true;
export const OBTAIN_ITEM_MINING_CACHE_BASE_COST = false;
export const OBTAIN_ITEM_CRAFTING_CACHE_BASE_COST = false;
export const OBTAIN_ITEM_PICKING_CACHE_BASE_COST = false;
export const OBTAIN_ITEM_SMELTING_CACHE_BASE_COST = false;

// disabling this seems to alleviate the issue of getting stuck on corners
export const ALLOW_SPRINTING = false;

export const FIND_BLOCK_MAX_DISTANCE = 256;
