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

// It would be useful to have these based on distance
// (we can't do that however as distance is highly dynamic)
export const CRAFT_RECIPE_BASE_COST = 0.75;
export const DIG_BLOCK_BASE_COST = 1;
export const SMELT_ITEM_BASE_COST = 0;
export const PICKING_ITEM_BASE_COST = 0.1;
// 2 * CRAFT_RECIPE_BASE_COST > SMELT_ITEM_BASE_COST + DIG_BLOCK_BASE_COST
// if not, then crafting ingots into nuggets and back is cheaper than mining and smelting raw ore into ingots
// this is why SMELT_ITEM_BASE_COST is SO high and why CRAFT_RECIPE_BASE_COST is so low
// 4 * DIG_BLOCK_BASE_COST > CRAFT_RECIPE_BASE_COST + DIG_BLOCK_BASE_COST
// if not, then mining oak planks from mineshafts becomes cheaper than crafting planks from oak logs

// Disable if not OP
export const DEBUG_VISUALS = true;

export const SMELT_ITEM_FUEL_ITEM_NAME = 'coal';

// none may potentially lead to less calculations but is less dynamic, possibly leading to erroneous actions, such as taking the same action twice
export const STACK_PRUNING_METHOD: 'none' | 'subdivision-hash' = 'none';

export const ALLOW_SPRINTING = true;

export const FIND_BLOCK_MAX_DISTANCE = 16;

// the bot frequently gets stuck on corners
export const DISABLE_DIAGONAL_MOVEMENT = true;

// in situations like:
// top-down:
//  .
// 12.G
// where 1 is the bot
//       2 is a block
//       . is a path node
//       G is the goal
// the bot frequently gets stuck when jumping
export const DISABLE_JUMPING = true;

// false - use minimum value
export const OBTAIN_ITEM_CRAFTING_USE_EXPECTED_VALUE = true;
