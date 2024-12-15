import { Bot, BotOptions } from 'mineflayer';

import { TASK_SLEEP_DELAY_MS } from '../settings.js';
import Task from '../task/index.js';

interface Harts {
  stack: Task[];
  run(task: Task): Promise<void>;
}

declare module 'mineflayer' {
  interface Bot {
    harts: Harts;
  }
}

export function harts(bot: Bot, options: BotOptions) {
  const harts: Harts = {
    stack: [],
    async run(task: Task): Promise<void> {
      harts.stack.push(task);

      while (true) {
        await new Promise((resolve) =>
          setTimeout(resolve, TASK_SLEEP_DELAY_MS)
        );

        // console.clear();

        console.log('---');

        for (const [i, task] of harts.stack.entries()) {
          console.log(`${i + 1}. ${task} ${task.getCost()}`);
        }

        const task = harts.stack.pop();

        if (task === undefined) {
          break;
        }

        const substitute = await task.run();

        if (substitute !== undefined) {
          harts.stack.push(...substitute);
        }
      }
    },
  };

  bot.harts = harts;
}
