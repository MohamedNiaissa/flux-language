const readline = require('readline')

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '>>> '
})

rl.prompt()

rl.on('line', (line) => {
    rl.prompt()
})

rl.on('close', () => {
    console.log('\nBye!')
    process.exit(0)
})