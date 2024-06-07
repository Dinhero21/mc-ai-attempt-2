function mcai:course/reset

setblock 0 1 3 furnace keep
setblock 0 1 -3 crafting_table keep

function mcai:source/new {x: 2, y: 1, z: -1, block: stone}
function mcai:source/new {x: 2, y: 1, z: 1, block: oak_log}

function mcai:source/new {x: -2, y: 1, z: -3, block: gold_ore}
function mcai:source/new {x: -2, y: 1, z: -1, block: coal_ore}
function mcai:source/new {x: -2, y: 1, z: 1, block: iron_ore}
function mcai:source/new {x: -2, y: 1, z: 3, block: copper_ore}

function mcai:source/new {x: -4, y: 1, z: -3, block: redstone_ore}
function mcai:source/new {x: -4, y: 1, z: -1, block: emerald_ore}
function mcai:source/new {x: -4, y: 1, z: 1, block: lapis_ore}
function mcai:source/new {x: -4, y: 1, z: 3, block: diamond_ore}
