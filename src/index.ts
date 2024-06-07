import bot from './singleton/bot.js'

bot.on('chat', (username, message) => {
  console.log(`${username}: ${message}`)
})

// import registry from 'prismarine-registry'

// console.log(registry('1.20.4').dimensionsByName)
