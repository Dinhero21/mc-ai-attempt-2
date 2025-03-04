import { ReactiveMap, ReactiveValue } from './react.js';
import bot from './singleton/bot.js';

// item id -> count
export const itemCount = new ReactiveMap<number, number>();

bot.once('inject_allowed', () => {
  bot.inventory.on('updateSlot', (slot, oldItem, newItem) => {
    if (oldItem !== null)
      itemCount.set(
        oldItem.type,
        (itemCount.get(oldItem.type) ?? 0) - oldItem.count
      );
    if (newItem !== null)
      itemCount.set(
        newItem.type,
        (itemCount.get(newItem.type) ?? 0) + newItem.count
      );
  });
});

const cache = new Map<number, ReactiveValue<number>>();
export function getReactiveItemCountForId(id: number): ReactiveValue<number> {
  const cached = cache.get(id);
  if (cached !== undefined) return cached;

  const reactive = itemCount.getReactive(id).derive((count) => count ?? 0);
  cache.set(id, reactive);

  return reactive;
}
