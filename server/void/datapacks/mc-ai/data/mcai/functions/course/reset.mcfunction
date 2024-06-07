fill -10 0 -10 10 0 10 bedrock
fill -10 1 -10 10 5 10 air

# kill @e[type=marker]

gamerule doMobLoot false
kill @e[type=!player]
gamerule doMobLoot true

setblock 0 0 0 barrier
summon block_display 0 0 0 {transformation: {left_rotation: [0f, 0f, 0f, 1f], right_rotation: [0f, 0f, 0f, 1f], translation: [-0.5f, 0f, -0.5f], scale: [1f, 1f, 1f]}, block_state: {Name: "minecraft:structure_block"}}

execute as @a[gamemode=survival] run function mcai:course/reset-player
