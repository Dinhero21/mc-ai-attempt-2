import { Bot, BotOptions } from 'mineflayer';

import { AbortionHandler } from '../abort.js';
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

        console.clear();

        for (const [i, task] of harts.stack.entries()) {
          console.log(`${i + 1}. ${task} ${task.getCost().value}`);
        }

        const task = harts.stack.pop();

        if (task === undefined) {
          break;
        }

        const hashes = harts.stack.map((task) => task.getSubdivisionHash());

        const oldHashes = hashes.map((hash) => hash.value);

        const ah = new AbortionHandler();
        const abort = () => {
          ah.abort();
        };

        if (STACK_PRUNING_METHOD === 'subdivision-hash') {
          for (const hash of hashes) {
            hash.subscribe(abort, false);
          }
        }

        const substitute = await task.run(ah);

        if (STACK_PRUNING_METHOD === 'subdivision-hash') {
          for (const hash of hashes) {
            hash.unsubscribe(abort);
          }
        }

        const newHashes = hashes.map((hash) => hash.value);

        if (substitute !== undefined) {
          harts.stack.push(...substitute);
        }

        if (STACK_PRUNING_METHOD === 'subdivision-hash')
          for (let i = 0; i < hashes.length; i++) {
            if (oldHashes[i] === newHashes[i]) continue;

            harts.stack = harts.stack.slice(0, i + 1);
            break;
          }
      }
    },
  };

  bot.harts = harts;
}
