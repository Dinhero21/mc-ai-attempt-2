import { Block } from 'prismarine-block';
import { PCChunk } from 'prismarine-chunk';

import { ReactiveMap, ReactiveValue } from './react.js';
import { FIND_BLOCK_MAX_DISTANCE } from './settings.js';
import bot from './singleton/bot.js';

// id -> count
export const blockCount = new ReactiveMap<number, number>();

const loadedChunkColumns = new Set<string>();
bot.on('chunkColumnLoad', (pos) => {
  const hash = `${pos.x}|${pos.y}|${pos.z}`;
  if (loadedChunkColumns.has(hash)) return;
  loadedChunkColumns.add(hash);

  const column = bot.world.getColumnAt(pos) as PCChunk;

  for (const section of column.sections) {
    if (section.solidBlockCount === 0) continue;

    const paletteContainer = section.data;
    const bitArray = paletteContainer.data;

    for (let i = 0; i < bitArray.capacity; i++) {
      const paletteId = bitArray.get(i);

      const stateId = paletteContainer.palette[paletteId];
      const block = bot.registry.blocksByStateId[stateId];

      if (block.id === 0) continue;

      blockCount.set(block.id, (blockCount.get(block.id) ?? 0) + 1);
    }
  }
});

bot.on('blockUpdate', (oldBlock, newBlock) => {
  const oldId = oldBlock?.type;
  const newId = newBlock.type;

  if (oldId !== undefined)
    blockCount.set(oldId, (blockCount.get(oldId) ?? 0) - 1);
  blockCount.set(newId, (blockCount.get(newId) ?? 0) + 1);
});

export function getNearestBlock(id: number): ReactiveValue<Block | null> {
  return blockCount.getReactive(id).derive((count) => {
    if (count === undefined || count === 0) return null;

    return bot.findBlock({
      matching: id,
      maxDistance: FIND_BLOCK_MAX_DISTANCE,
    });
  });
}
