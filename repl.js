const readline = require('readline')
const { Lexer } = require('./src/flux/lexer')

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '>>> '
})

rl.prompt()

rl.on('line', (line) => {
    const input = line.trim()

    if (input) {
        try {
            const tokens = new Lexer(input).tokenize()
            console.log(tokens.map(t => t))
        } catch (e) {
            console.error(e.message)
        }
    }

    rl.prompt()
})

rl.on('close', () => {
    console.log('\nBye!')
    process.exit(0)
})
