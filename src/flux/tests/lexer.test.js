const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { Lexer } = require('../lexer')
const { Token, TokenType } = require('../tokens')

function tokenize(source) {
    return new Lexer(source).tokenize()
}

// ─── helpers ────────────────────────────────────────────────────────────────

function T(type, lexeme, line) {
    return new Token(type, lexeme, line)
}

// ─── source fichier ──────────────────────────────────────────────────────────

describe('source fichier', () => {
    it('tokenizes a basic source fichier + puis affiche', () => {
        const tokens = tokenize(
            'source fichier("produits.csv")\n     puis affiche;'
        )
        assert.deepStrictEqual(tokens, [
            T(TokenType.SOURCE,     'source',        1),
            T(TokenType.IDENTIFIER, 'fichier',        1),
            T(TokenType.LPAREN,     '(',              1),
            T(TokenType.STRING,     'produits.csv',   1),
            T(TokenType.RPAREN,     ')',              1),
            T(TokenType.PUIS,       'puis',           2),
            T(TokenType.AFFICHE,    'affiche',        2),
            T(TokenType.SEMICOLON,  ';',              2),
            T(TokenType.EOF,        '',               2),
        ])
    })
})

// ─── source api ──────────────────────────────────────────────────────────────

describe('source api', () => {
    it('tokenizes a source api + puis affiche', () => {
        const tokens = tokenize(
            'source api("https://api.exemple.com/utilisateurs")\n     puis affiche;'
        )
        assert.deepStrictEqual(tokens, [
            T(TokenType.SOURCE,     'source',                                   1),
            T(TokenType.IDENTIFIER, 'api',                                      1),
            T(TokenType.LPAREN,     '(',                                        1),
            T(TokenType.STRING,     'https://api.exemple.com/utilisateurs',     1),
            T(TokenType.RPAREN,     ')',                                        1),
            T(TokenType.PUIS,       'puis',                                     2),
            T(TokenType.AFFICHE,    'affiche',                                  2),
            T(TokenType.SEMICOLON,  ';',                                        2),
            T(TokenType.EOF,        '',                                         2),
        ])
    })
})

// ─── source liste ────────────────────────────────────────────────────────────

describe('source liste', () => {
    it('tokenizes a source liste with numbers', () => {
        const tokens = tokenize(
            'source liste([340, 12, 89])\n     puis affiche;'
        )
        assert.deepStrictEqual(tokens, [
            T(TokenType.SOURCE,     'source',   1),
            T(TokenType.IDENTIFIER, 'liste',    1),
            T(TokenType.LPAREN,     '(',        1),
            T(TokenType.LBRACKET,   '[',        1),
            T(TokenType.NUMBER,     '340',      1),
            T(TokenType.COMMA,      ',',        1),
            T(TokenType.NUMBER,     '12',       1),
            T(TokenType.COMMA,      ',',        1),
            T(TokenType.NUMBER,     '89',       1),
            T(TokenType.RBRACKET,   ']',        1),
            T(TokenType.RPAREN,     ')',        1),
            T(TokenType.PUIS,       'puis',     2),
            T(TokenType.AFFICHE,    'affiche',  2),
            T(TokenType.SEMICOLON,  ';',        2),
            T(TokenType.EOF,        '',         2),
        ])
    })
})

// ─── puis extrait ────────────────────────────────────────────────────────────

describe('puis extrait', () => {
    it('tokenizes an extrait with field list', () => {
        const tokens = tokenize('puis extrait [nom, salaire, ville]')
        assert.deepStrictEqual(tokens, [
            T(TokenType.PUIS,       'puis',     1),
            T(TokenType.EXTRAIT,    'extrait',  1),
            T(TokenType.LBRACKET,   '[',        1),
            T(TokenType.IDENTIFIER, 'nom',      1),
            T(TokenType.COMMA,      ',',        1),
            T(TokenType.IDENTIFIER, 'salaire',  1),
            T(TokenType.COMMA,      ',',        1),
            T(TokenType.IDENTIFIER, 'ville',    1),
            T(TokenType.RBRACKET,   ']',        1),
            T(TokenType.EOF,        '',         1),
        ])
    })
})

// ─── puis filtre ─────────────────────────────────────────────────────────────

describe('puis filtre', () => {
    it('tokenizes a simple < comparison', () => {
        const tokens = tokenize('puis filtre prix < 50')
        assert.deepStrictEqual(tokens, [
            T(TokenType.PUIS,       'puis',     1),
            T(TokenType.FILTRE,     'filtre',   1),
            T(TokenType.IDENTIFIER, 'prix',     1),
            T(TokenType.LESS,       '<',        1),
            T(TokenType.NUMBER,     '50',       1),
            T(TokenType.EOF,        '',         1),
        ])
    })

    it('tokenizes >= and == with et and vrai', () => {
        const tokens = tokenize('puis filtre age >= 18 et abonne == vrai')
        assert.deepStrictEqual(tokens, [
            T(TokenType.PUIS,           'puis',     1),
            T(TokenType.FILTRE,         'filtre',   1),
            T(TokenType.IDENTIFIER,     'age',      1),
            T(TokenType.GREATER_EQUAL,  '>=',       1),
            T(TokenType.NUMBER,         '18',       1),
            T(TokenType.ET,             'et',       1),
            T(TokenType.IDENTIFIER,     'abonne',   1),
            T(TokenType.EQUAL_EQUAL,    '==',       1),
            T(TokenType.VRAI,           'vrai',     1),
            T(TokenType.EOF,            '',         1),
        ])
    })

    it('tokenizes == with string values and ou', () => {
        const tokens = tokenize('puis filtre ville == "Paris" ou ville == "Lyon"')
        assert.deepStrictEqual(tokens, [
            T(TokenType.PUIS,        'puis',     1),
            T(TokenType.FILTRE,      'filtre',   1),
            T(TokenType.IDENTIFIER,  'ville',    1),
            T(TokenType.EQUAL_EQUAL, '==',       1),
            T(TokenType.STRING,      'Paris',    1),
            T(TokenType.OU,          'ou',       1),
            T(TokenType.IDENTIFIER,  'ville',    1),
            T(TokenType.EQUAL_EQUAL, '==',       1),
            T(TokenType.STRING,      'Lyon',     1),
            T(TokenType.EOF,         '',         1),
        ])
    })

    it('tokenizes == faux', () => {
        const tokens = tokenize('puis filtre bloque == faux')
        assert.deepStrictEqual(tokens, [
            T(TokenType.PUIS,        'puis',     1),
            T(TokenType.FILTRE,      'filtre',   1),
            T(TokenType.IDENTIFIER,  'bloque',   1),
            T(TokenType.EQUAL_EQUAL, '==',       1),
            T(TokenType.FAUX,        'faux',     1),
            T(TokenType.EOF,         '',         1),
        ])
    })
})

// ─── puis transforme ─────────────────────────────────────────────────────────

describe('puis transforme', () => {
    it('tokenizes a transforme with arithmetic', () => {
        const tokens = tokenize('puis transforme prix est prix * 1.2')
        assert.deepStrictEqual(tokens, [
            T(TokenType.PUIS,        'puis',       1),
            T(TokenType.TRANSFORME,  'transforme', 1),
            T(TokenType.IDENTIFIER,  'prix',       1),
            T(TokenType.EST,         'est',        1),
            T(TokenType.IDENTIFIER,  'prix',       1),
            T(TokenType.STAR,        '*',          1),
            T(TokenType.NUMBER,      '1.2',        1),
            T(TokenType.EOF,         '',           1),
        ])
    })

    it('tokenizes a transforme assigning a string', () => {
        const tokens = tokenize('puis transforme devise est "EUR"')
        assert.deepStrictEqual(tokens, [
            T(TokenType.PUIS,        'puis',       1),
            T(TokenType.TRANSFORME,  'transforme', 1),
            T(TokenType.IDENTIFIER,  'devise',     1),
            T(TokenType.EST,         'est',        1),
            T(TokenType.STRING,      'EUR',        1),
            T(TokenType.EOF,         '',           1),
        ])
    })
})

// ─── puis sauvegarde ─────────────────────────────────────────────────────────

describe('puis sauvegarde', () => {
    it('tokenizes a sauvegarde with filename', () => {
        const tokens = tokenize('puis sauvegarde "meteo.json";')
        assert.deepStrictEqual(tokens, [
            T(TokenType.PUIS,       'puis',         1),
            T(TokenType.SAUVEGARDE, 'sauvegarde',   1),
            T(TokenType.STRING,     'meteo.json',   1),
            T(TokenType.SEMICOLON,  ';',            1),
            T(TokenType.EOF,        '',             1),
        ])
    })
})

// ─── pipeline / debut / fin ───────────────────────────────────────────────────

describe('pipeline / debut / fin', () => {
    it('tokenizes a pipeline header with debut', () => {
        const tokens = tokenize('pipeline traiter_commandes debut')
        assert.deepStrictEqual(tokens, [
            T(TokenType.PIPELINE,   'pipeline',              1),
            T(TokenType.IDENTIFIER, 'traiter_commandes',     1),
            T(TokenType.DEBUT,      'debut',                 1),
            T(TokenType.EOF,        '',                      1),
        ])
    })

    it('tokenizes fin on its own line', () => {
        const tokens = tokenize('fin')
        assert.deepStrictEqual(tokens, [
            T(TokenType.FIN,  'fin',  1),
            T(TokenType.EOF,  '',     1),
        ])
    })
})

// ─── pipe operator | ─────────────────────────────────────────────────────────

describe('pipe operator', () => {
    it('tokenizes the | pipeline call operator', () => {
        const tokens = tokenize(
            'source fichier("commandes_janvier.csv") | traiter_commandes;'
        )
        assert.deepStrictEqual(tokens, [
            T(TokenType.SOURCE,     'source',                   1),
            T(TokenType.IDENTIFIER, 'fichier',                  1),
            T(TokenType.LPAREN,     '(',                        1),
            T(TokenType.STRING,     'commandes_janvier.csv',    1),
            T(TokenType.RPAREN,     ')',                        1),
            T(TokenType.PIPE,       '|',                        1),
            T(TokenType.IDENTIFIER, 'traiter_commandes',        1),
            T(TokenType.SEMICOLON,  ';',                        1),
            T(TokenType.EOF,        '',                         1),
        ])
    })
})

// ─── != operator ─────────────────────────────────────────────────────────────

describe('!= operator', () => {
    it('tokenizes != in a filtre condition', () => {
        const tokens = tokenize('puis filtre statut != "annulée"')
        assert.deepStrictEqual(tokens, [
            T(TokenType.PUIS,        'puis',       1),
            T(TokenType.FILTRE,      'filtre',     1),
            T(TokenType.IDENTIFIER,  'statut',     1),
            T(TokenType.BANG_EQUAL,  '!=',         1),
            T(TokenType.STRING,      'annulée',    1),
            T(TokenType.EOF,         '',           1),
        ])
    })
})

// ─── comments ────────────────────────────────────────────────────────────────

describe('comments', () => {
    it('skips // line comments', () => {
        const tokens = tokenize(
            '// lire un fichier csv local\nsource fichier("produits.csv")'
        )
        assert.deepStrictEqual(tokens, [
            T(TokenType.SOURCE,     'source',       2),
            T(TokenType.IDENTIFIER, 'fichier',      2),
            T(TokenType.LPAREN,     '(',            2),
            T(TokenType.STRING,     'produits.csv', 2),
            T(TokenType.RPAREN,     ')',            2),
            T(TokenType.EOF,        '',             2),
        ])
    })
})