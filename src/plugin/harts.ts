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
          console.log(`${i + 1}. ${task} ${task.getCost()}`);
        }

        const task = harts.stack.pop();

        if (task === undefined) {
          break;
        }

        const taskAndCostBefore =
          STACK_PRUNING_METHOD === 'cost-delta'
            ? harts.stack.map((task) => [task, task.getCost()])
            : undefined;

        const substitute = await task.run();

        if (substitute !== undefined) {
          harts.stack.push(...substitute);
        }

        if (
          STACK_PRUNING_METHOD === 'full' &&
          (substitute === undefined || substitute.length === 0)
        ) {
          harts.stack = [harts.stack[0]];
        }

        const taskAndCostAfter =
          STACK_PRUNING_METHOD === 'cost-delta'
            ? harts.stack.map((task) => [task, task.getCost()])
            : undefined;

        if (taskAndCostBefore !== undefined && taskAndCostAfter !== undefined) {
          for (let i = 0; i < taskAndCostAfter.length; i++) {
            if (taskAndCostBefore[i]?.[0] !== taskAndCostAfter[i][0]) continue;
            if (taskAndCostBefore[i][1] === taskAndCostAfter[i][1]) continue;

            harts.stack = harts.stack.slice(0, i);
            break;
          }
        }
      }
    },
  };

  bot.harts = harts;
}
