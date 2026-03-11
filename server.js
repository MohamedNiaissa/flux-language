const http = require('http')
const express = require('express')
const client = require('prom-client')
const { Lexer }       = require('./src/flux/lexer')
const { Parser }      = require('./src/flux/parser')
const { Interpreter } = require('./src/flux/interpreter')

const app = express()

// --- Prometheus metrics setup ---
const register = new client.Registry()
client.collectDefaultMetrics({ register })

const httpRequestsTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register],
})

const httpRequestDurationSeconds = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
    registers: [register],
})

const pageVisitsTotal = new client.Counter({
    name: 'page_visits_total',
    help: 'Total page visits (GET requests to the website)',
    registers: [register],
})

const codeExecutionsTotal = new client.Counter({
    name: 'flux_code_executions_total',
    help: 'Total Flux code executions via /api/run',
    labelNames: ['status'],
    registers: [register],
})

// Track request metrics for all routes
app.use((req, res, next) => {
    const end = httpRequestDurationSeconds.startTimer()
    res.on('finish', () => {
        const route = req.path === '/' ? '/' : req.path.startsWith('/api') ? req.path : '/static'
        const labels = { method: req.method, route, status_code: res.statusCode }
        httpRequestsTotal.inc(labels)
        end(labels)
        if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/metrics')) {
            pageVisitsTotal.inc()
        }
    })
    next()
})

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

app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType)
    res.end(await register.metrics())
})

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
        codeExecutionsTotal.inc({ status: 'success' })
        res.json({ output: lines.join('\n') })
    } catch (err) {
        codeExecutionsTotal.inc({ status: 'error' })
        next(err)
    }
})

app.use((err, req, res, next) => {
    res.status(400).json({ error: err.message })
})

server.listen(port);
