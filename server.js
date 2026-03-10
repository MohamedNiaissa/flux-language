const http = require('http')
const express = require('express')
const { Lexer }       = require('./src/flux/lexer')
const { Parser }      = require('./src/flux/parser')
const { Interpreter } = require('./src/flux/interpreter')

const app = express()

app.use(express.json())
app.use(express.static('public'))
const normalizePort = val => {
    const port = parseInt(val, 10);

    if (isNaN(port)) {
        return val;
    }
    if (port >= 0) {
        return port;
    }
    return false;
};

const port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

/*
 recherche les différentes erreurs et les gère de manière appropriée.
 Elle est ensuite enregistrée dans le serveur
 */
const errorHandler = error => {
    if (error.syscall !== 'listen') {
        throw error;
    }
    const address = server.address();
    const bind = typeof address === 'string' ? 'pipe ' + address : 'port: ' + port;
    switch (error.code) {
        case 'EACCES':
            console.error(bind + ' requires elevated privileges.');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(bind + ' is already in use.');
            process.exit(1);
            break;
        default:
            throw error;
    }
};

const server = http.createServer(app);

server.on('error', errorHandler);
server.on('listening', () => {
    const address = server.address();
    const bind = typeof address === 'string' ? 'pipe ' + address : 'port ' + port;
    console.log('Listening on ' + bind);
});

app.post('/api/run', async (req, res, next) => {
    try {
        const { code } = req.body
        if (!code || typeof code !== 'string') {
            return res.status(400).json({ error: 'Paramètre code manquant.' })
        }
        const lines = []
        const interpreter = new Interpreter({ print: (line) => lines.push(line) })
        const tokens = new Lexer(code).tokenize()
        const ast    = new Parser(tokens).parse()
        await interpreter.interpret(ast)
        res.json({ output: lines.join('\n') })
    } catch (err) {
        next(err)
    }
})

app.use((err, req, res, next) => {
    res.status(400).json({ error: err.message })
})

server.listen(port);
