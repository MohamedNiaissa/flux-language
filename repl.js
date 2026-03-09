const readline = require('readline')
const { Lexer } = require('./src/flux/lexer')
const { Parser } = require('./src/flux/parser')

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '>>> '
})

// Accumulate lines until the statement is complete.
// A statement ends with ';' (source) or 'fin' (pipeline declaration).
let buffer = []

function isComplete(lines) {
    const joined = lines.join('\n').trimEnd()
    return joined.endsWith(';') || /\bfin\s*$/.test(joined)
}

function runBuffer() {
    const source = buffer.join('\n')
    buffer = []
    try {
        const tokens = new Lexer(source).tokenize()
        const ast    = new Parser(tokens).parse()
        console.log(JSON.stringify(ast, null, 2))
    } catch (e) {
        console.error(e.message)
    }
}

rl.prompt()

rl.on('line', (line) => {
    const trimmed = line.trim()

    // Skip blank lines and comments when the buffer is empty
    if (!trimmed && buffer.length === 0) {
        rl.prompt()
        return
    }

    if (trimmed) buffer.push(trimmed)

    if (buffer.length > 0 && isComplete(buffer)) {
        runBuffer()
        rl.prompt()
    } else {
        // Still inside a multi-line statement — show continuation prompt
        rl.setPrompt('... ')
        rl.prompt()
        rl.setPrompt('>>> ')
    }
})

rl.on('close', () => {
    console.log('\nBye!')
    process.exit(0)
})
