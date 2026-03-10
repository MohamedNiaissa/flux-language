# flux

A French-syntax data pipeline language — write it, run it.

Flux lets you fetch, filter, transform, and display data using a readable pipeline syntax inspired by natural French. No boilerplate, no configuration — just describe what you want step by step.

**[Try it live →](http://localhost:3000)**

---

## Example

```
source api("https://jsonplaceholder.typicode.com/users")
  puis extrait [id, name, email]
  puis filtre id < 5
  puis affiche;
```

```json
[
  { "id": 1, "name": "Leanne Graham", "email": "Sincere@april.biz" },
  { "id": 2, "name": "Ervin Howell",  "email": "Shanna@melissa.tv" },
  ...
]
```

---

## Language reference

### Source

Every program starts with a `source` that loads data from an API.

```
source api("https://example.com/data")
  puis affiche;
```

### Pipeline steps

Steps are chained with `puis` (then).

| Keyword       | What it does                              | Example                                      |
|---------------|-------------------------------------------|----------------------------------------------|
| `affiche`     | Print the current dataset                 | `puis affiche`                               |
| `extrait`     | Keep only the listed fields               | `puis extrait [id, name, email]`             |
| `filtre`      | Keep rows matching a condition            | `puis filtre age >= 18`                      |
| `transforme`  | Compute a new value for a field           | `puis transforme prix est prix * 1.2`        |
| `sauvegarde`  | Write the result to a JSON file           | `puis sauvegarde "output.json"`              |

### Conditions (`filtre`)

```
puis filtre statut == "actif"
puis filtre age >= 18 et abonne == vrai
puis filtre ville == "Paris" ou ville == "Lyon"
```

Supported operators: `==` `!=` `<` `<=` `>` `>=`
Logical combinators: `et` `ou`
Boolean literals: `vrai` `faux`

### Expressions (`transforme`)

```
puis transforme prix est prix * 0.9
puis transforme devise est "EUR"
```

Supported operators: `+` `-` `*` `/`

### Named pipelines

Define a reusable pipeline with `pipeline ... debut ... fin`, then apply it with `|`.

```
pipeline traiter debut
  puis filtre statut == "validée"
  puis extrait [client, montant]
  puis affiche;
fin

source api("https://example.com/commandes_jan") | traiter;
source api("https://example.com/commandes_fev") | traiter;
```

---

## Project structure

```
src/
└── flux/
    ├── lexer.js         # Tokenises source code into a token stream
    ├── parser.js        # Recursive descent parser — produces an AST
    ├── ast_nodes.js     # AST node definitions
    ├── interpreter.js   # Walks the AST and executes each statement
    ├── environment.js   # Stores named pipeline declarations
    ├── tokens.js        # Token types and keyword map
    └── tests/           # Unit and integration tests

public/
    ├── index.html       # Playground UI
    ├── style.css        # Styles
    └── app.js           # Editor, tabs, run logic

repl.js                  # Interactive REPL (CLI)
server.js                # Express server + /api/run endpoint
```

---

## Getting started

```bash
npm install
npm start         # starts the server on port 3000
```

Open `http://localhost:3000` to use the playground.

To use the REPL instead:

```bash
node repl.js
```

```
>>> source api("https://jsonplaceholder.typicode.com/users")
...   puis extrait [id, name]
...   puis filtre id < 3
...   puis affiche;
```

---

## Running tests

```bash
npm test
```

Covers the lexer, parser, and interpreter independently.

---

## How it works

```
source code  →  Lexer  →  tokens  →  Parser  →  AST  →  Interpreter  →  output
```

1. **Lexer** — scans the source character by character and emits a flat list of tokens.
2. **Parser** — consumes tokens using recursive descent and builds an AST.
3. **Interpreter** — walks the AST, fetches data from APIs, and applies each step in sequence.

The interpreter accepts dependency injection (`fetch`, `print`, `writeFile`) for easy testing without real HTTP calls or filesystem access.
