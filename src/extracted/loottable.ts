import { readdir, readFile } from 'fs/promises';
import { resolve } from 'path';

import bot from '../singleton/bot.js';

// item id -> block id -> expected value
export const blockLootExpectedValueMap = new Map<number, Map<number, number>>();

const dir = resolve('extracted', bot.version, 'loot_tables');

for (const file of await readdir(dir)) {
  if (!file.endsWith('.json')) {
    console.warn(
      `Warning: While populating blockLootExpectedValueMap: Skipping ${file}`
    );
    continue;
  }

  const path = resolve(dir, file);
  const text = await readFile(path, 'utf8');
  const data = JSON.parse(text);

  const expectedDrops = getLootTableExpectedDrops(data);

  const blockName = file.slice(0, -5);
  const block = bot.registry.blocksByName[blockName];

  for (const [namespacedName, expectedValue] of expectedDrops) {
    if (!namespacedName.startsWith('minecraft:')) continue;

    const itemName = namespacedName.slice(10);
    const item = bot.registry.itemsByName[itemName];

    const map =
      blockLootExpectedValueMap.get(item.id) ?? new Map<never, never>();
    blockLootExpectedValueMap.set(item.id, map);

    map.set(block.id, expectedValue);
  }
}

interface Function {
  function: string;
  [key: string]: unknown;
}

interface BaseCondition {
  condition: string;
}

interface MatchToolCondition extends BaseCondition {
  condition: 'minecraft:match_tool';
  predicate: unknown[];
}

interface SurvivesExplosionCondition extends BaseCondition {
  condition: 'minecraft:survives_explosion';
  probability: number;
}

interface InvertedCondition extends BaseCondition {
  condition: 'minecraft:inverted';
  term: Condition;
}

interface AnyOfCondition extends BaseCondition {
  condition: 'minecraft:any_of';
  terms: Condition[];
}

interface BlockStatePropertyCondition extends BaseCondition {
  condition: 'minecraft:block_state_property';
  block: string;
  properties: unknown;
}

interface LocationCheckCondition extends BaseCondition {
  condition: 'minecraft:location_check';
  offsetY: number;
  predicate: unknown;
}

interface EntityPropertiesCondition extends BaseCondition {
  condition: 'minecraft:entity_properties';
  entity: string;
  predicate: unknown;
}

interface TableBonusCondition extends BaseCondition {
  condition: 'minecraft:table_bonus';
  chances: number[];
  enchantment: string;
}

interface RandomChanceCondition extends BaseCondition {
  condition: 'minecraft:random_chance';
  chance: number;
}

type Condition =
  | MatchToolCondition
  | SurvivesExplosionCondition
  | InvertedCondition
  | AnyOfCondition
  | BlockStatePropertyCondition
  | LocationCheckCondition
  | EntityPropertiesCondition
  | TableBonusCondition
  | RandomChanceCondition;

interface BaseEntry {
  type: string;
  functions?: Function[];
  conditions?: Condition[];
}

interface ItemEntry extends BaseEntry {
  type: 'minecraft:item';
  name: string;
}

interface LootTableEntry extends BaseEntry {
  type: 'minecraft:loot_table';
  name: string;
}

interface DynamicEntry extends BaseEntry {
  type: 'minecraft:dynamic';
  name: string;
}

interface CompositeEntry extends BaseEntry {
  type: 'minecraft:group' | 'minecraft:alternatives' | 'minecraft:sequence';
  children: Entry[];
}

type Entry = ItemEntry | LootTableEntry | DynamicEntry | CompositeEntry;

interface Pool {
  bonus_rolls?: number;
  conditions?: Condition[];
  entries: Entry[];
  functions?: Function[];
  rolls: number;
}

interface BaseLootTable {
  type: string;
}

interface BlockLootTable extends BaseLootTable {
  type: 'minecraft:block';
  pools?: Pool[];
  functions?: Function[];
  random_sequence?: string;
}

type LootTable = BlockLootTable;

function getLootTableExpectedDrops(data: LootTable): Map<string, number> {
  const drops = new Map<string, number>();

  if (data.pools === undefined) return drops;

  for (const pool of data.pools) {
    const poolDrops = getPoolExpectedDrops(pool);

    for (const [name, expectedValue] of poolDrops) {
      drops.set(name, expectedValue + (drops.get(name) ?? 0));
    }
  }

  return drops;
}

function getPoolExpectedDrops(pool: Pool): Map<string, number> {
  const drops = new Map<string, number>();

  for (const entry of pool.entries) {
    const entryDrops = getEntryExpectedDrops(entry);

    for (const [name, expectedValue] of entryDrops) {
      drops.set(name, expectedValue + (drops.get(name) ?? 0));
    }
  }

  let multiplier = pool.rolls;

  for (const condition of pool.conditions ?? []) {
    multiplier *= getConditionProbability(condition);
  }

  for (const [name, expectedValue] of drops) {
    drops.set(name, expectedValue * multiplier);
  }

  return drops;
}

function getEntryExpectedDrops(
  entry: Entry
): Map<string, number> & { probability: number } {
  const drops = new Map<string, number>();

  switch (entry.type) {
    case 'minecraft:item':
      drops.set(entry.name, 1);
      break;
    case 'minecraft:loot_table':
      break;
    case 'minecraft:dynamic':
      break;
    case 'minecraft:group':
      for (const subEntry of entry.children) {
        const subEntryDrops = getEntryExpectedDrops(subEntry);

        for (const [name, expectedValue] of subEntryDrops) {
          drops.set(name, expectedValue + (drops.get(name) ?? 0));
        }
      }
      break;
    case 'minecraft:alternatives':
      let failure = 1;

      for (const subEntry of entry.children) {
        const subEntryDrops = getEntryExpectedDrops(subEntry);

        for (const [name, expectedValue] of subEntryDrops) {
          drops.set(name, expectedValue * failure + (drops.get(name) ?? 0));
        }

        failure *= 1 - subEntryDrops.probability;
      }

      break;
    case 'minecraft:sequence':
      let success = 1;

      for (const subEntry of entry.children) {
        const subEntryDrops = getEntryExpectedDrops(subEntry);

        for (const [name, expectedValue] of subEntryDrops) {
          drops.set(name, expectedValue * success + (drops.get(name) ?? 0));
        }

        success *= subEntryDrops.probability;
      }

      break;
    default:
      console.warn(`Unknown entry type: ${(entry as BaseEntry).type}`);
      console.warn(`Entry: ${JSON.stringify(entry)}`);
      throw new Error();
  }

  let probability = 1;

  for (const condition of entry.conditions ?? []) {
    probability *= getConditionProbability(condition);
  }

  (drops as any).probability = probability;

  for (const [name, expectedValue] of drops) {
    drops.set(name, expectedValue * probability);
  }

  return drops as typeof drops & { probability: number };
}

function getConditionProbability(condition: Condition): number {
  switch (condition.condition) {
    case 'minecraft:survives_explosion':
      return 1;
    case 'minecraft:match_tool':
      return 0;
    case 'minecraft:inverted':
      return 1 - getConditionProbability(condition.term);
    case 'minecraft:any_of':
      // assuming all terms are independent
      // P = ∑ - ∏
      const sum = condition.terms.reduce(
        (a, b) => a + getConditionProbability(b),
        0
      );
      const product = condition.terms.reduce(
        (a, b) => a * getConditionProbability(b),
        1
      );

      return sum - product;
    case 'minecraft:block_state_property':
      return 1;
    case 'minecraft:location_check':
      return 1;
    case 'minecraft:entity_properties':
      return 1;
    case 'minecraft:table_bonus':
      return condition.chances[0];
    case 'minecraft:random_chance':
      return condition.chance;
    default:
      console.warn(
        `Unknown condition type: ${(condition as BaseCondition).condition}`
      );
      console.warn(`Condition: ${JSON.stringify(condition)}`);
      return 1;
  }
}
