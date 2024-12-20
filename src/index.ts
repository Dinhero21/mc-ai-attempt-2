import {
  ALLOW_SPRINTING,
  DEBUG_VISUALS,
  DISABLE_DIAGONAL_MOVEMENT,
} from './settings.js';
import bot from './singleton/bot.js';
import ObtainItemCraftingTask from './task/obtain-item/crafting.js';
import ObtainItemTask from './task/obtain-item/index.js';
import { ObtainItemMiningTask } from './task/obtain-item/mining.js';
import ObtainItemSmeltingTask from './task/obtain-item/smelting.js';

bot.pathfinder.movements.allowSprinting = ALLOW_SPRINTING;

if (DISABLE_DIAGONAL_MOVEMENT)
  bot.pathfinder.movements.getMoveDiagonal = () => {};

bot.on('chat', async (username, message) => {
  console.log(`${username}: ${message}`);
  if (message !== 'start') return;

  // const block = findBlock(bot.registry.blocksByName.stone.id);
  // if (block === null) return;

  // const task = new CollectBlockTask(block, []);

  // const task = new ObtainItemTask(
  //   bot.registry.itemsByName.oak_log.id,
  //   1,
  //   []
  // );

  // const task = new ObtainItemTask(
  //   bot.registry.itemsByName.oak_planks.id,
  //   1,
  //   []
  // );

  // const task = new ObtainItemTask(
  //   bot.registry.itemsByName.stick.id,
  //   1,
  //   []
  // );

  // const task = new ObtainItemTask(
  //   bot.registry.itemsByName.wooden_pickaxe.id,
  //   1,
  //   []
  // );

  // const task = new ObtainItemTask(
  //   bot.registry.itemsByName.cobblestone.id,
  //   1,
  //   []
  // );

  // const task = new ObtainItemTask(
  //   bot.registry.itemsByName.cobblestone_pickaxe.id,
  //   1,
  //   []
  // );

  // const task = new ObtainItemTask(
  //   bot.registry.itemsByName.raw_iron.id,
  //   1,
  //   []
  // );

  // const task = new ObtainItemTask(
  //   bot.registry.itemsByName.iron_ingot.id,
  //   1,
  //   []
  // );

  // const task = new ObtainItemTask(
  //   bot.registry.itemsByName.iron_pickaxe.id,
  //   1,
  //   []
  // );

  // const task = new ObtainItemTask(
  //   bot.registry.itemsByName.diamond.id,
  //   1,
  //   []
  // );

  // const crafting = new ObtainItemCraftingTask(
  //   bot.registry.itemsByName.iron_ingot.id,
  //   2,
  //   []
  // );

  // const smelting = new ObtainItemSmeltingTask(
  //   bot.registry.itemsByName.iron_ingot.id,
  //   2,
  //   []
  // );

  // const raw = new ObtainItemTask(bot.registry.itemsByName.raw_iron.id, 1, []);

  // console.log('crafting.cost:', crafting.getCost());
  // console.log('smelting.cost:', smelting.getCost());

  // if (true as boolean) return;

  const task = new ObtainItemTask(bot.registry.itemsByName.diamond.id, 1, []);

  console.time('calculating cost');
  console.log('cost:', task.getCost());
  console.timeEnd('calculating cost');

  console.time('executing task');
  await bot.harts.run(task);
  console.timeEnd('executing task');

  bot.chat('Done!');
});

// ? Where should I put this
if (DEBUG_VISUALS) {
  // I tried making commands as short as possible
  // TODO: rcon or something
  bot.on('path_reset', () => {
    bot.chat('/kill @e[tag=path]');
  });
  bot.on('path_stop', () => {
    bot.chat('/kill @e[tag=path]');
  });
  bot.on('goal_reached', () => {
    bot.chat('/kill @e[tag=path]');
  });
  bot.on('path_update', (path) => {
    bot.chat('/kill @e[tag=path]');
    for (const move of path.path) {
      bot.chat(
        `/summon block_display ${move.x} ${move.y} ${
          move.z
        } {Tags:[path],brightness:{sky:15,block:15},transformation:{left_rotation:[0f,0f,0f,1f],right_rotation:[0f,0f,0f,1f],translation:[-.125f,-.125f,-.125f],scale:[.25f,.25f,.25f]},block_state:{Name:${
          move.parkour ? 'blue' : 'red'
        }_wool}}`
      );
    }
    const goal = bot.pathfinder.goal;
    if (goal !== null && 'x' in goal && 'y' in goal && 'z' in goal) {
      bot.chat(
        `/summon block_display ${goal.x} ${goal.y} ${goal.z} {Tags:[path],brightness:{sky:15,block:15},transformation:{left_rotation:[0f,0f,0f,1f],right_rotation:[0f,0f,0f,1f],translation:[-.125f,-.125f,-.125f],scale:[.25f,.25f,.25f]},block_state:{Name:lime_wool}}`
      );
    }
  });
  // let moves: Move[] | undefined;
  // bot.on('path_reset', () => {
  //   moves = undefined;
  // });
  // bot.on('path_stop', () => {
  //   moves = undefined;
  // });
  // bot.on('path_update', (path) => {
  //   moves = path.path;
  // });
  // setInterval(() => {
  //   if (moves === undefined) return;
  //   for (const move of moves) {
  //     particle(
  //       move.parkour ? 0 : 255,
  //       move.parkour ? 0 : 0,
  //       move.parkour ? 255 : 0,
  //       1,
  //       move.x,
  //       move.y + 0.5,
  //       move.z,
  //       0.25,
  //       0,
  //       0.25,
  //       0,
  //       10
  //     );
  //   }
  //   const goal = bot.pathfinder.goal;
  //   if (goal !== null && 'x' in goal && 'y' in goal && 'z' in goal) {
  //     particle(
  //       0,
  //       255,
  //       0,
  //       1,
  //       goal.x as number,
  //       (goal.y as number) + 0.5,
  //       goal.z as number,
  //       0.25,
  //       0.25,
  //       0.25,
  //       0,
  //       25
  //     );
  //   }
  // }, 1000 / 12);
  // function particle(
  //   r: number,
  //   g: number,
  //   b: number,
  //   a: number,
  //   x: number,
  //   y: number,
  //   z: number,
  //   dx: number,
  //   dy: number,
  //   dz: number,
  //   speed: number,
  //   count: number
  // ) {
  //   bot.chat(
  //     `/particle dust ${r} ${g} ${b} ${a} ${x} ${y} ${z} ${dx} ${dy} ${dz} ${speed} ${count} force`
  //   );
  // }
}
