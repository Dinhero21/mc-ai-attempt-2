import {
  ALLOW_SPRINTING,
  DISABLE_DIAGONAL_MOVEMENT,
  DISABLE_JUMPING,
} from '../settings.js';
import bot from '../singleton/bot.js';

bot.once('inject_allowed', () => {
  bot.pathfinder.movements.allowSprinting = ALLOW_SPRINTING;

  if (DISABLE_DIAGONAL_MOVEMENT)
    bot.pathfinder.movements.getMoveDiagonal = () => {};

  if (DISABLE_JUMPING) bot.pathfinder.movements.getMoveJumpUp = () => {};
});
