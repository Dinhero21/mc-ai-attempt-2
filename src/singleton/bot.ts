import { createBot } from 'mineflayer';

import { harts } from '../plugin/harts.js';
import { pathfinder } from '../plugin/pathfinder.js';

const bot = createBot({
  host: '0.0.0.0',
  port: 25565,
  username: 'mc-ai',
  version: '1.20.4',
});

bot.loadPlugin(pathfinder);
bot.loadPlugin(harts);

export default bot;
