const { Token, TokenType, KEYWORDS } = require('./tokens');

class Lexer {
  constructor(source) {
    this.source = source;
    this.start = 0;
    this.current = 0;
    this.line = 1;
    this.tokens = [];
  }

  tokenize() {
    while (!this.isAtEnd()) {
      this.start = this.current;
      this.scanToken();
    }

    this.tokens.push(new Token(TokenType.EOF, '', this.line));
    return this.tokens;
  }

  scanToken() {
    const c = this.advance();

    switch (c) {
      // Whitespace
      case ' ':
      case '\r':
      case '\t':
        break;
      case '\n':
        this.line++;
        break;

      // Single-character symbols
      case '(': this.addToken(TokenType.LPAREN); break;
      case ')': this.addToken(TokenType.RPAREN); break;
      case '[': this.addToken(TokenType.LBRACKET); break;
      case ']': this.addToken(TokenType.RBRACKET); break;
      case ',': this.addToken(TokenType.COMMA); break;
      case ';': this.addToken(TokenType.SEMICOLON); break;
      case '|': this.addToken(TokenType.PIPE); break;
      case '+': this.addToken(TokenType.PLUS); break;
      case '-': this.addToken(TokenType.MINUS); break;
      case '*': this.addToken(TokenType.STAR); break;

      // Operators that may be two characters
      case '<':
        this.addToken(this.match('=') ? TokenType.LESS_EQUAL : TokenType.LESS);
        break;
      case '>':
        this.addToken(this.match('=') ? TokenType.GREATER_EQUAL : TokenType.GREATER);
        break;
      case '=':
        if (this.match('=')) {
          this.addToken(TokenType.EQUAL_EQUAL);
        } else {
          throw new SyntaxError(`Caractère inattendu '=' à la ligne ${this.line} — utilisez '==' pour comparer`);
        }
        break;
      case '!':
        if (this.match('=')) {
          this.addToken(TokenType.BANG_EQUAL);
        } else {
          throw new SyntaxError(`Caractère inattendu '!' à la ligne ${this.line} — utilisez '!=' pour la différence`);
        }
        break;

      // Comments
      case '/':
        if (this.match('/')) {
          while (this.peek() !== '\n' && !this.isAtEnd()) this.advance();
        } else {
          this.addToken(TokenType.SLASH);
        }
        break;

      // String literals
      case '"':
        this.string();
        break;

      default:
        if (this.isDigit(c)) {
          this.number();
        } else if (this.isAlpha(c)) {
          this.identifier();
        } else {
          throw new SyntaxError(
            `Caractère inattendu '${c}' à la ligne ${this.line}`
          );
        }
    }
  }

  string() {
    while (this.peek() !== '"' && !this.isAtEnd()) {
      if (this.peek() === '\n') this.line++;
      this.advance();
    }

    if (this.isAtEnd()) {
      throw new SyntaxError(`Chaîne de caractères non fermée à la ligne ${this.line} — ajoutez un guillemet fermant "`);
    }

    this.advance(); // closing "
    const value = this.source.slice(this.start + 1, this.current - 1);
    this.tokens.push(new Token(TokenType.STRING, value, this.line));
  }

  match(expected) {
    if (this.isAtEnd()) return false;
    if (this.source[this.current] !== expected) return false;
    this.current++;
    return true;
  }

  number() {
    while (this.isDigit(this.peek())) this.advance();

    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      this.advance();
      while (this.isDigit(this.peek())) this.advance();
    }

    this.addToken(TokenType.NUMBER);
  }

  identifier() {
    while (this.isAlphaNumeric(this.peek())) this.advance();

    const text = this.source.slice(this.start, this.current);
    const type = KEYWORDS[text] ?? TokenType.IDENTIFIER;
    this.addToken(type);
  }

  isAtEnd() {
    return this.current >= this.source.length;
  }

  advance() {
    return this.source[this.current++];
  }

  peek() {
    if (this.isAtEnd()) return '\0';
    return this.source[this.current];
  }

  peekNext() {
    if (this.current + 1 >= this.source.length) return '\0';
    return this.source[this.current + 1];
  }

  addToken(type) {
    const lexeme = this.source.slice(this.start, this.current);
    this.tokens.push(new Token(type, lexeme, this.line));
  }

  isDigit(c) { return c >= '0' && c <= '9'; }
  isAlpha(c) { return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_'; }
  isAlphaNumeric(c) { return this.isAlpha(c) || this.isDigit(c); }
}

module.exports = { Lexer };