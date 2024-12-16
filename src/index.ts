import { ALLOW_SPRINTING, DEBUG_VISUALS } from './settings.js';
import bot from './singleton/bot.js';
import ObtainItemTask from './task/obtain-item/index.js';

bot.pathfinder.movements.allowSprinting = ALLOW_SPRINTING;

bot.on('chat', async (username, message) => {
  console.log(`${username}: ${message}`);

  if (message !== 'start') return;

  // const block = bot.findBlock({
  //   matching: bot.registry.blocksByName.stone.id,
  // });

  // if (block === null) return;

  // const task = new CollectBlockTask(block, []);

  // const obtainOakPlanks = new ObtainItemTask(
  //   bot.registry.itemsByName.oak_planks.id,
  //   1,
  //   []
  // );
  // console.log('--- oak planks cost:', obtainOakPlanks.getCost());

  // const obtainStick = new ObtainItemTask(
  //   bot.registry.itemsByName.stick.id,
  //   1,
  //   []
  // );
  // console.log('--- stick cost:', obtainStick.getCost());

  // const obtainWoodenPickaxe = new ObtainItemTask(
  //   bot.registry.itemsByName.wooden_pickaxe.id,
  //   1,
  //   []
  // );
  // console.log('--- wooden pickaxe cost:', obtainWoodenPickaxe.getCost());

  // const obtainCobblestone = new ObtainItemTask(
  //   bot.registry.itemsByName.cobblestone.id,
  //   1,
  //   []
  // );
  // console.log('--- cobblestone cost:', obtainCobblestone.getCost());

  // const obtainCobblestonePickaxe = new ObtainItemTask(
  //   bot.registry.itemsByName.cobblestone_pickaxe.id,
  //   1,
  //   []
  // );
  // console.log('--- cobblestone pickaxe cost:', obtainCobblestonePickaxe.getCost());

  // const obtainRawIron = new ObtainItemTask(
  //   bot.registry.itemsByName.raw_iron.id,
  //   1,
  //   []
  // );
  // console.log('--- raw iron cost:', obtainRawIron.getCost());

  // const obtainIronIngot = new ObtainItemTask(
  //   bot.registry.itemsByName.iron_ingot.id,
  //   1,
  //   []
  // );
  // console.log('--- iron ingot cost:', obtainIronIngot.getCost());

  // const obtainIronPickaxe = new ObtainItemTask(
  //   bot.registry.itemsByName.iron_pickaxe.id,
  //   1,
  //   []
  // );
  // console.log('--- iron pickaxe cost:', obtainIronPickaxe.getCost());

  const obtainDiamond = new ObtainItemTask(
    bot.registry.itemsByName.diamond.id,
    1,
    []
  );
  console.log('--- diamond cost:', obtainDiamond.getCost());

  await bot.harts.run(obtainDiamond);

  bot.chat('Done!');
});

// ? Where should I put this

if (DEBUG_VISUALS) {
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
        } {Tags:["path"],brightness:{sky:15,block:15},transformation:{left_rotation:[0f,0f,0f,1f],right_rotation:[0f,0f,0f,1f],translation:[-0.125f,-0.125f,-0.125f],scale:[0.25f,0.25f,0.25f]},block_state:{Name:"minecraft:${
          move.parkour ? 'blue' : 'red'
        }_wool"}}`
      );
    }

    const goal = bot.pathfinder.goal;

    if (goal !== null && 'x' in goal && 'y' in goal && 'z' in goal) {
      bot.chat(
        `/summon block_display ${goal.x} ${goal.y} ${goal.z} {Tags:["path"],brightness:{sky:15,block:15},transformation:{left_rotation:[0f,0f,0f,1f],right_rotation:[0f,0f,0f,1f],translation:[-0.125f,-0.125f,-0.125f],scale:[0.25f,0.25f,0.25f]},block_state:{Name:"minecraft:lime_wool"}}`
      );
    }
  });
}
