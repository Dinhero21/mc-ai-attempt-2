import { Bot, BotOptions } from 'mineflayer';

import { STACK_PRUNING_METHOD, TASK_SLEEP_DELAY_MS } from '../settings.js';
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

        console.log('---');

        for (const [i, task] of harts.stack.entries()) {
          console.log(`${i + 1}. ${task} ${task.getCost().value}`);
        }

        const task = harts.stack.pop();

        if (task === undefined) {
          break;
        }

        const costs = harts.stack.map((task) => task.getCost());

        const oldCosts = costs.map((cost) => cost.value);

        const substitute = await task.run();

        const newCosts = costs.map((cost) => cost.value);

        if (substitute !== undefined) {
          harts.stack.push(...substitute);
        }

        // if (
        //   STACK_PRUNING_METHOD === 'full' &&
        //   (substitute === undefined || substitute.length === 0)
        // ) {
        //   harts.stack = [harts.stack[0]];
        // }

        if (STACK_PRUNING_METHOD === 'cost-delta')
          for (let i = 0; i < costs.length; i++) {
            if (oldCosts[i] === newCosts[i]) continue;

            harts.stack = harts.stack.slice(0, i);
            break;
          }
      }
    },
  };

  bot.harts = harts;
}
