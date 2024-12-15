import { readdir, readFile } from 'fs/promises';
import { resolve } from 'path';

import bot from './singleton/bot.js';

const dir = resolve('extracted', bot.version, 'recipes');

export const recipesByType = new Map<string, Set<unknown>>();

for (const file of await readdir(dir)) {
  if (!file.endsWith('.json')) {
    console.warn(`Warning: While parsing recipes: Skipping ${file}`);
    continue;
  }

  const path = resolve(dir, file);
  const text = await readFile(path, 'utf8');
  const data = JSON.parse(text);

  const set = recipesByType.get(data.type) ?? new Set();
  recipesByType.set(data.type, set);

  set.add(data);
}
