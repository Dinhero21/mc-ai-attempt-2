import pkg from 'mineflayer-pathfinder';

export const pathfinder = pkg.pathfinder;
export const goals = pkg.goals;
export const Movements = pkg.Movements;

export const Goal = goals.Goal;
export const GoalBlock = goals.GoalBlock;
export const GoalNear = goals.GoalNear;
export const GoalXZ = goals.GoalXZ;
export const GoalNearXZ = goals.GoalNearXZ;
export const GoalY = goals.GoalY;
export const GoalGetToBlock = goals.GoalGetToBlock;
export const GoalCompositeAny = goals.GoalCompositeAny;
export const GoalCompositeAll = goals.GoalCompositeAll;
export const GoalInvert = goals.GoalInvert;
export const GoalFollow = goals.GoalFollow;
export const GoalPlaceBlock = goals.GoalPlaceBlock;
export const GoalLookAtBlock = goals.GoalLookAtBlock;
export const GoalBreakBlock = goals.GoalBreakBlock;

export type Goal = InstanceType<typeof Goal>;
export type GoalBlock = InstanceType<typeof GoalBlock>;
export type GoalNear = InstanceType<typeof GoalNear>;
export type GoalXZ = InstanceType<typeof GoalXZ>;
export type GoalNearXZ = InstanceType<typeof GoalNearXZ>;
export type GoalY = InstanceType<typeof GoalY>;
export type GoalGetToBlock = InstanceType<typeof GoalGetToBlock>;
export type GoalCompositeAny = InstanceType<typeof GoalCompositeAny>;
export type GoalCompositeAll = InstanceType<typeof GoalCompositeAll>;
export type GoalInvert = InstanceType<typeof GoalInvert>;
export type GoalFollow = InstanceType<typeof GoalFollow>;
export type GoalPlaceBlock = InstanceType<typeof GoalPlaceBlock>;
export type GoalLookAtBlock = InstanceType<typeof GoalLookAtBlock>;
export type GoalBreakBlock = InstanceType<typeof GoalBreakBlock>;
