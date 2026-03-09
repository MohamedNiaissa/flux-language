const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { Lexer }       = require('../lexer');
const { Parser }      = require('../parser');
const { Interpreter } = require('../interpreter');

// ─── helpers ─────────────────────────────────────────────────────────────────

function parse(source) {
  const tokens = new Lexer(source).tokenize();
  return new Parser(tokens).parse();
}

function makeInterpreter(mockData, output = [], written = {}) {
  return new Interpreter({
    fetch:     async (_url) => ({ ok: true, json: async () => mockData }),
    print:     (line) => output.push(line),
    writeFile: async (path, content) => { written[path] = content; },
  });
}

// ─── source api + affiche ─────────────────────────────────────────────────────

describe('source api + affiche', () => {
  it('fetches the URL and displays the response', async () => {
    const mockData = [{ id: 1, nom: 'Alice' }, { id: 2, nom: 'Bob' }];
    const output   = [];

    const ast = parse('source api("https://api.exemple.com/users") puis affiche;');
    await makeInterpreter(mockData, output).interpret(ast);

    assert.strictEqual(output.length, 1);
    assert.deepStrictEqual(JSON.parse(output[0]), mockData);
  });

  it('wraps a single-object response in an array', async () => {
    const mockData = { id: 1, nom: 'Alice' };
    const output   = [];

    const ast = parse('source api("https://api.exemple.com/user/1") puis affiche;');
    await makeInterpreter(mockData, output).interpret(ast);

    assert.deepStrictEqual(JSON.parse(output[0]), [mockData]);
  });

  it('throws when the API responds with an error status', async () => {
    const interpreter = new Interpreter({
      fetch: async (_url) => ({ ok: false, status: 404 }),
    });

    const ast = parse('source api("https://api.exemple.com/missing") puis affiche;');
    await assert.rejects(() => interpreter.interpret(ast), /Erreur API 404/);
  });

  it('throws when the connector is not api', async () => {
    const interpreter = new Interpreter({
      fetch: async (_url) => ({ ok: true, json: async () => [] }),
    });

    const ast = parse('source fichier("data.csv") puis affiche;');
    await assert.rejects(() => interpreter.interpret(ast), /non supporté/);
  });
});

// ─── affiche pass-through ─────────────────────────────────────────────────────

describe('affiche — data flows through unchanged', () => {
  it('prints the full dataset when it is the only step', async () => {
    const mockData = [{ x: 1 }, { x: 2 }, { x: 3 }];
    const output   = [];

    await makeInterpreter(mockData, output)
      .interpret(parse('source api("https://api.exemple.com/data") puis affiche;'));

    assert.deepStrictEqual(JSON.parse(output[0]), mockData);
  });

  it('can appear multiple times, printing the dataset at each point', async () => {
    const mockData = [{ n: 1 }, { n: 2 }];
    const output   = [];

    await makeInterpreter(mockData, output).interpret(
      parse('source api("https://api.exemple.com/data") puis affiche puis affiche;')
    );

    assert.strictEqual(output.length, 2);
    assert.deepStrictEqual(JSON.parse(output[0]), mockData);
    assert.deepStrictEqual(JSON.parse(output[1]), mockData);
  });
});

// ─── extrait ─────────────────────────────────────────────────────────────────

describe('puis extrait + affiche', () => {
  it('keeps only the requested fields', async () => {
    const mockData = [
      { id: 1, nom: 'Alice', age: 30, ville: 'Paris' },
      { id: 2, nom: 'Bob',   age: 25, ville: 'Lyon'  },
    ];
    const output = [];

    await makeInterpreter(mockData, output).interpret(
      parse('source api("https://api.exemple.com/users")\n  puis extrait [nom, ville]\n  puis affiche;')
    );

    assert.deepStrictEqual(JSON.parse(output[0]), [
      { nom: 'Alice', ville: 'Paris' },
      { nom: 'Bob',   ville: 'Lyon'  },
    ]);
  });
});

// ─── filtre ───────────────────────────────────────────────────────────────────

describe('puis filtre + affiche', () => {
  it('keeps only rows matching a simple condition', async () => {
    const mockData = [
      { nom: 'Alice', age: 30 },
      { nom: 'Bob',   age: 17 },
      { nom: 'Carol', age: 25 },
    ];
    const output = [];

    await makeInterpreter(mockData, output).interpret(
      parse('source api("https://api.exemple.com/users")\n  puis filtre age >= 18\n  puis affiche;')
    );

    const displayed = JSON.parse(output[0]);
    assert.strictEqual(displayed.length, 2);
    assert.ok(displayed.every(r => r.age >= 18));
  });

  it('applies a compound ET condition', async () => {
    const mockData = [
      { nom: 'Alice', age: 30, abonne: true  },
      { nom: 'Bob',   age: 22, abonne: false },
      { nom: 'Carol', age: 15, abonne: true  },
    ];
    const output = [];

    await makeInterpreter(mockData, output).interpret(
      parse('source api("https://api.exemple.com/clients")\n  puis filtre age >= 18 et abonne == vrai\n  puis affiche;')
    );

    const displayed = JSON.parse(output[0]);
    assert.strictEqual(displayed.length, 1);
    assert.strictEqual(displayed[0].nom, 'Alice');
  });
});

// ─── transforme ───────────────────────────────────────────────────────────────

describe('puis transforme + affiche', () => {
  it('applies an arithmetic expression to a field on each row', async () => {
    const mockData = [
      { produit: 'stylo',  prix: 2 },
      { produit: 'cahier', prix: 5 },
    ];
    const output = [];

    await makeInterpreter(mockData, output).interpret(
      parse('source api("https://api.exemple.com/catalogue")\n  puis transforme prix est prix * 1.2\n  puis affiche;')
    );

    const displayed = JSON.parse(output[0]);
    assert.strictEqual(displayed[0].prix, 2 * 1.2);
    assert.strictEqual(displayed[1].prix, 5 * 1.2);
  });
});

// ─── sauvegarde ───────────────────────────────────────────────────────────────

describe('puis sauvegarde', () => {
  it('writes the dataset as JSON to the given filename', async () => {
    const mockData = [{ ville: 'Paris', temperature: 20 }];
    const written  = {};

    await makeInterpreter(mockData, [], written).interpret(
      parse('source api("https://api.exemple.com/meteo")\n  puis sauvegarde "meteo.json";')
    );

    assert.ok('meteo.json' in written, 'file should have been written');
    assert.deepStrictEqual(JSON.parse(written['meteo.json']), mockData);
  });

  it('passes the data through so further steps still receive it', async () => {
    const mockData = [{ id: 1, nom: 'Alice' }];
    const output   = [];
    const written  = {};

    await makeInterpreter(mockData, output, written).interpret(
      parse('source api("https://api.exemple.com/users")\n  puis sauvegarde "users.json"\n  puis affiche;')
    );

    // data was saved
    assert.deepStrictEqual(JSON.parse(written['users.json']), mockData);
    // data was also displayed
    assert.strictEqual(output.length, 1);
    assert.deepStrictEqual(JSON.parse(output[0]), mockData);
  });
});

// ─── pipeline + pipe operator ─────────────────────────────────────────────────

describe('pipeline declaration + pipe operator', () => {
  it('runs a named pipeline on the API data', async () => {
    const mockData = [
      { client: 'Alice', montant: 100, statut: 'validée'  },
      { client: 'Bob',   montant: 200, statut: 'annulée'  },
      { client: 'Carol', montant: 150, statut: 'validée'  },
    ];
    const output = [];

    const src = [
      'pipeline traiter_commandes debut',
      '  puis filtre statut == "validée"',
      '  puis affiche;',
      'fin',
      'source api("https://api.exemple.com/commandes") | traiter_commandes;',
    ].join('\n');

    await makeInterpreter(mockData, output).interpret(parse(src));

    const displayed = JSON.parse(output[0]);
    assert.strictEqual(displayed.length, 2);
    assert.ok(displayed.every(r => r.statut === 'validée'));
  });
});