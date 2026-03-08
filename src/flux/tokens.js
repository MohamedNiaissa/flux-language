const TokenType = Object.freeze({
  // Literals
  IDENTIFIER: 'IDENTIFIER',
  NUMBER: 'NUMBER',
  STRING: 'STRING',

  // Keywords
  SOURCE: 'SOURCE',         // Déclare l'origine des données
  PUIS: 'PUIS',             // Enchaîne une opération au pipeline
  EXTRAIT: 'EXTRAIT',       // Sélectionne certains champs uniquement
  FILTRE: 'FILTRE',         // Garde les lignes qui satisfont la condition
  TRANSFORME: 'TRANSFORME', // Modifie une valeur sur chaque ligne
  AFFICHE: 'AFFICHE',       // Affiche le résultat dans la console
  SAUVEGARDE: 'SAUVEGARDE', // Écrit le résultat dans un fichier
  PIPELINE: 'PIPELINE',     // Déclare un pipeline nommé réutilisable
  DEBUT: 'DEBUT',           // Ouvre le corps d'un pipeline nommé
  FIN: 'FIN',               // Ferme un pipeline nommé
  EST: 'EST',               // Opérateur d'assignation (dans transforme)
  ET: 'ET',                 // Combinaison de conditions (dans filtre)
  OU: 'OU',                 // Combinaison de conditions (dans filtre)
  VRAI: 'VRAI',             // Valeur booléenne true
  FAUX: 'FAUX',             // Valeur booléenne false

  // Symbols
  LPAREN: 'LPAREN',         // (
  RPAREN: 'RPAREN',         // )
  LBRACKET: 'LBRACKET',     // [
  RBRACKET: 'RBRACKET',     // ]
  COMMA: 'COMMA',           // ,
  SEMICOLON: 'SEMICOLON',   // ;
  PIPE: 'PIPE',             // |

  // Operators
  PLUS: 'PLUS',             // +
  MINUS: 'MINUS',           // -
  STAR: 'STAR',             // *
  SLASH: 'SLASH',           // /
  LESS: 'LESS',             // <
  LESS_EQUAL: 'LESS_EQUAL', // <=
  GREATER: 'GREATER',       // >
  GREATER_EQUAL: 'GREATER_EQUAL', // >=
  EQUAL_EQUAL: 'EQUAL_EQUAL',     // ==
  BANG_EQUAL: 'BANG_EQUAL',       // !=

  EOF: 'EOF',
});

class Token {
  constructor(type, lexeme, line) {
    this.type = type;
    this.lexeme = lexeme;
    this.line = line;
  }

  toString() {
    return `Token(${this.type}, '${this.lexeme}', line=${this.line})`;
  }
}

const KEYWORDS = {
  source:     TokenType.SOURCE,
  puis:       TokenType.PUIS,
  extrait:    TokenType.EXTRAIT,
  filtre:     TokenType.FILTRE,
  transforme: TokenType.TRANSFORME,
  affiche:    TokenType.AFFICHE,
  sauvegarde: TokenType.SAUVEGARDE,
  pipeline:   TokenType.PIPELINE,
  debut:      TokenType.DEBUT,
  fin:        TokenType.FIN,
  est:        TokenType.EST,
  et:         TokenType.ET,
  ou:         TokenType.OU,
  vrai:       TokenType.VRAI,
  faux:       TokenType.FAUX,
};

module.exports = { TokenType, Token, KEYWORDS };
