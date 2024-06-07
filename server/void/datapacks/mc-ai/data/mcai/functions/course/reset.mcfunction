fill -10 0 -10 10 0 10 bedrock
fill -10 1 -10 10 5 10 air
setblock 0 0 0 barrier

# kill @e[type=marker]

gamerule doMobLoot false
kill @e[type=!player]
gamerule doMobLoot true

execute as @a[gamemode=survival] run function mcai:course/reset-player
