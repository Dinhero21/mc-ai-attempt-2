import {
  ALLOW_SPRINTING,
  DEBUG_VISUALS,
  DISABLE_DIAGONAL_MOVEMENT,
} from './settings.js';
import bot from './singleton/bot.js';
import ObtainItemTask from './task/obtain-item/index.js';

bot.pathfinder.movements.allowSprinting = ALLOW_SPRINTING;

if (DISABLE_DIAGONAL_MOVEMENT)
  bot.pathfinder.movements.getMoveDiagonal = () => {};

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

type Command = (...args: string[]) => void | Promise<void>;

const commands: Map<string, Command> = new Map();

commands.set('obtain', async (itemName, countString) => {
  if (itemName === undefined) {
    bot.chat('Usage: obtain <item>');
    return;
  }

  const item = bot.registry.itemsByName[itemName];
  if (item === undefined) {
    bot.chat(`Unknown item: ${itemName}`);
    return;
  }

  let count = parseInt(countString);
  if (isNaN(count)) {
    count = 1;
  }

  const task = new ObtainItemTask(item.id, count, []);

  const start = performance.now();
  await bot.harts.run(task);
  const end = performance.now();

  const date = new Date(end - start);

  bot.chat(
    `Done in ${date.getUTCHours()}h${date.getUTCMinutes()}m${date.getUTCSeconds()}s${date.getUTCMilliseconds()}ms!`
  );
});

bot.on('chat', async (username, message) => {
  console.log(`${username}: ${message}`);
  if (!message.startsWith('@')) return;

  const commandMessage = message.slice(1);
  const args = commandMessage.split(' ');

  const commandName = args.shift();
  if (commandName === undefined) return;

  const command = commands.get(commandName);
  if (command === undefined) {
    bot.chat(`Unknown command: ${commandName}`);
    return;
  }

  await command(...args);
});
