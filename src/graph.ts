import { createWriteStream } from 'fs';

import { DUMP_REACTIVE_VALUES_TO_DOT } from './settings.js';

export const stream = DUMP_REACTIVE_VALUES_TO_DOT
  ? createWriteStream('graph.dot')
  : undefined;

if (stream !== undefined)
  stream.write(`digraph G {\nnode [style=filled];\nrankdir=LR;\n`);
