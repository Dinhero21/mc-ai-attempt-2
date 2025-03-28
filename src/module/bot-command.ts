import { writeFile } from 'fs/promises';

import { reactiveValueSet, reactiveValuesInMemory } from '../react.js';
import bot from '../singleton/bot.js';
import ObtainItemTask from '../task/obtain-item/index.js';

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

Array.prototype.toString = function () {
  return `[${this.join(',')}]`;
};
commands.set('graph', async () => {
  const lines: string[] = [];

  reactiveValueSet.forEach((value) => {
    let label = String(value.value);

    if (label.length > 100) {
      label = label.slice(0, 97) + '...';
    }

    lines.push(`${value.id}[label=${JSON.stringify(label)}];`);

    for (const ref of value.refs) {
      lines.push(`${ref.id} -> ${value.id};`);
    }
  });

  await writeFile('graph.dot', `digraph G {\n${lines.join('\n')}\n}\n`);
});

commands.set('gc', async () => {
  if (!('gc' in globalThis)) return;

  gc();
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
