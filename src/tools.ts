import bot from './singleton/bot.js';

export const materials = [
  'wooden',
  'stone',
  'iron',
  'golden',
  'diamond',
  'netherite',
];
export const toolTypes = ['shovel', 'pickaxe', 'axe', 'hoe', 'sword'];
export const tools = materials.flatMap((material) =>
  toolTypes.map((toolType) => `${material}_${toolType}`)
);

export const toolIds = tools.map((tool) => bot.registry.itemsByName[tool].id);

export default tools;
