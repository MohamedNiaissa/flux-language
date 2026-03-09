/**
 * Recursive descent parser for the Flux language.
 *
 * Each grammar rule maps to a parse_* method that consumes tokens and returns
 * an AST node — same approach as the toy-language parser but adapted to
 * Flux's pipeline-oriented syntax.
 *
 * Parsing a full program example:
 *
 *   source fichier("produits.csv")
 *     puis filtre prix < 50
 *     puis affiche;
 *
 *   ─► parseStatement() sees SOURCE  → parseSourceStatement()
 *       connector = 'fichier', arg = StringLiteral('produits.csv')
 *       parseSteps():
 *         PUIS → parseOperation() → FILTRE → parseFilter()
 *           → parseCondition() → parseComparison()
 *               field=prix, op=<, right=NumberLiteral(50)
 *         PUIS → parseOperation() → AFFICHE → DisplayStep
 *       pipeTarget = null
 *   ─► SourceStatement { connector, arg, steps, pipeTarget }
 */

const { TokenType } = require('./tokens');
const {
  Program,
  SourceStatement,
  PipelineDeclaration,
  ExtractStep,
  FilterStep,
  TransformStep,
  DisplayStep,
  SaveStep,
  Comparison,
  CompoundCondition,
  BinaryExpr,
  NumberLiteral,
  StringLiteral,
  BoolLiteral,
  FieldRef,
  ListLiteral,
} = require('./ast_nodes');

class Parser {
  /** @param {import('./tokens').Token[]} tokens */
  constructor(tokens) {
    this.tokens  = tokens;
    this.current = 0;
  }

  // ─── Entry point ────────────────────────────────────────────────────────────

  /** @returns {Program} */
  parse() {
    const statements = [];
    while (!this.isAtEnd()) {
      statements.push(this.parseStatement());
    }
    return new Program(statements);
  }

  // ─── Statements ─────────────────────────────────────────────────────────────

  parseStatement() {
    if (this.match(TokenType.PIPELINE)) return this.parsePipelineDeclaration();
    if (this.match(TokenType.SOURCE))   return this.parseSourceStatement();

    throw new SyntaxError(
      `Unexpected token '${this.peek().lexeme}' at line ${this.peek().line}`
    );
  }

  /**
   * pipeline traiter_commandes debut
   *   puis extrait [client, montant]
   *   puis filtre statut == "validée"
   *   puis sauvegarde "out.json";
   * fin
   */
  parsePipelineDeclaration() {
    const name = this.consume(TokenType.IDENTIFIER, "Expect pipeline name after 'pipeline'");
    this.consume(TokenType.DEBUT, "Expect 'debut' after pipeline name");

    const steps = this.parseSteps();

    // A trailing ';' on the last step inside a pipeline body is allowed
    // (mirrors the style shown in flux_exemples.md)
    this.match(TokenType.SEMICOLON);

    this.consume(TokenType.FIN, "Expect 'fin' to close pipeline body");
    return new PipelineDeclaration(name, steps);
  }

  /**
   * source fichier("produits.csv")
   *   puis extrait [nom, prix]
   *   puis affiche;
   *
   * source fichier("commandes.csv") | traiter_commandes;
   */
  parseSourceStatement() {
    const connector = this.consume(TokenType.IDENTIFIER, "Expect source connector after 'source'");
    this.consume(TokenType.LPAREN, "Expect '(' after source connector");
    const arg = this.parseSourceArg();
    this.consume(TokenType.RPAREN, "Expect ')' after source argument");

    const steps = this.parseSteps();

    let pipeTarget = null;
    if (this.match(TokenType.PIPE)) {
      pipeTarget = this.consume(TokenType.IDENTIFIER, "Expect pipeline name after '|'");
    }

    this.consume(TokenType.SEMICOLON, "Expect ';' at end of source statement");
    return new SourceStatement(connector, arg, steps, pipeTarget);
  }

  // ─── Source argument ─────────────────────────────────────────────────────────

  /**
   * sourceArg → STRING
   *           | LBRACKET (primary (COMMA primary)*)? RBRACKET
   */
  parseSourceArg() {
    if (this.check(TokenType.STRING)) {
      return new StringLiteral(this.advance().lexeme);
    }

    if (this.match(TokenType.LBRACKET)) {
      return this.parseListLiteral();
    }

    throw new SyntaxError(
      `Expect source argument (string or list) at line ${this.peek().line}`
    );
  }

  /** Called after '[' has been consumed. */
  parseListLiteral() {
    const elements = [];

    if (!this.check(TokenType.RBRACKET)) {
      elements.push(this.parsePrimary());
      while (this.match(TokenType.COMMA)) {
        elements.push(this.parsePrimary());
      }
    }

    this.consume(TokenType.RBRACKET, "Expect ']' after list elements");
    return new ListLiteral(elements);
  }

  // ─── Steps ──────────────────────────────────────────────────────────────────

  /** step* — consumes as many PUIS-led steps as available */
  parseSteps() {
    const steps = [];
    while (this.match(TokenType.PUIS)) {
      steps.push(this.parseOperation());
    }
    return steps;
  }

  /**
   * operation → EXTRAIT  LBRACKET IDENTIFIER (COMMA IDENTIFIER)* RBRACKET
   *           | FILTRE   condition
   *           | TRANSFORME IDENTIFIER EST expression
   *           | AFFICHE
   *           | SAUVEGARDE STRING
   */
  parseOperation() {
    if (this.match(TokenType.EXTRAIT))    return this.parseExtract();
    if (this.match(TokenType.FILTRE))     return this.parseFilter();
    if (this.match(TokenType.TRANSFORME)) return this.parseTransform();
    if (this.match(TokenType.AFFICHE))    return new DisplayStep();
    if (this.match(TokenType.SAUVEGARDE)) return this.parseSave();

    throw new SyntaxError(
      `Expect operation keyword after 'puis' at line ${this.peek().line}`
    );
  }

  /** puis extrait [nom, salaire, ville] */
  parseExtract() {
    this.consume(TokenType.LBRACKET, "Expect '[' after 'extrait'");

    const fields = [];
    fields.push(this.consume(TokenType.IDENTIFIER, "Expect field name in extrait list"));
    while (this.match(TokenType.COMMA)) {
      fields.push(this.consume(TokenType.IDENTIFIER, "Expect field name after ','"));
    }

    this.consume(TokenType.RBRACKET, "Expect ']' after extrait field list");
    return new ExtractStep(fields);
  }

  /** puis filtre condition */
  parseFilter() {
    return new FilterStep(this.parseCondition());
  }

  /** puis transforme field est expression */
  parseTransform() {
    const field = this.consume(TokenType.IDENTIFIER, "Expect field name after 'transforme'");
    this.consume(TokenType.EST, "Expect 'est' after field name in transforme");
    const expression = this.parseExpression();
    return new TransformStep(field, expression);
  }

  /** puis sauvegarde "filename" */
  parseSave() {
    const filename = this.consume(TokenType.STRING, "Expect filename string after 'sauvegarde'");
    return new SaveStep(filename);
  }

  // ─── Conditions ─────────────────────────────────────────────────────────────

  /**
   * condition → comparison ((ET | OU) comparison)*
   *
   * ET and OU are left-associative and share the same precedence level.
   */
  parseCondition() {
    let left = this.parseComparison();

    while (this.check(TokenType.ET) || this.check(TokenType.OU)) {
      const logical = this.advance();
      const right   = this.parseComparison();
      left = new CompoundCondition(left, logical, right);
    }

    return left;
  }

  /**
   * comparison → IDENTIFIER compOp primary
   * compOp     → == | != | < | <= | > | >=
   */
  parseComparison() {
    const field    = this.consume(TokenType.IDENTIFIER, "Expect field name in condition");
    const operator = this.consumeComparisonOp();
    const right    = this.parsePrimary();
    return new Comparison(field, operator, right);
  }

  consumeComparisonOp() {
    const ops = [
      TokenType.EQUAL_EQUAL,
      TokenType.BANG_EQUAL,
      TokenType.LESS,
      TokenType.LESS_EQUAL,
      TokenType.GREATER,
      TokenType.GREATER_EQUAL,
    ];
    for (const op of ops) {
      if (this.match(op)) return this.previous();
    }
    throw new SyntaxError(
      `Expect comparison operator (==, !=, <, <=, >, >=) at line ${this.peek().line}`
    );
  }

  // ─── Expressions (arithmetic) ────────────────────────────────────────────────

  /**
   * expression → term ((PLUS | MINUS) term)*
   */
  parseExpression() {
    return this.binaryLeft(
      () => this.parseTerm(),
      [TokenType.PLUS, TokenType.MINUS]
    );
  }

  /**
   * term → factor ((STAR | SLASH) factor)*
   */
  parseTerm() {
    return this.binaryLeft(
      () => this.parseFactor(),
      [TokenType.STAR, TokenType.SLASH]
    );
  }

  /**
   * factor → primary
   * (no unary in Flux — negative numbers use the lexer's NUMBER token)
   */
  parseFactor() {
    return this.parsePrimary();
  }

  /**
   * primary → NUMBER | STRING | VRAI | FAUX | IDENTIFIER
   */
  parsePrimary() {
    if (this.check(TokenType.NUMBER)) {
      return new NumberLiteral(parseFloat(this.advance().lexeme));
    }
    if (this.check(TokenType.STRING)) {
      return new StringLiteral(this.advance().lexeme);
    }
    if (this.match(TokenType.VRAI)) return new BoolLiteral(true);
    if (this.match(TokenType.FAUX)) return new BoolLiteral(false);
    if (this.check(TokenType.IDENTIFIER)) {
      return new FieldRef(this.advance());
    }

    throw new SyntaxError(
      `Unexpected token '${this.peek().lexeme}' at line ${this.peek().line}`
    );
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  /**
   * Factorises left-associative binary parsing (same pattern as toy-language).
   * @param {() => *}        operandFn
   * @param {string[]}       operators  — TokenType values
   */
  binaryLeft(operandFn, operators) {
    let left = operandFn();

    while (operators.some(op => this.check(op))) {
      const operator = this.advance();
      const right    = operandFn();
      left = new BinaryExpr(left, operator, right);
    }

    return left;
  }

  isAtEnd()         { return this.peek().type === TokenType.EOF; }
  peek()            { return this.tokens[this.current]; }
  previous()        { return this.tokens[this.current - 1]; }
  advance()         { if (!this.isAtEnd()) this.current++; return this.previous(); }
  check(type)       { return !this.isAtEnd() && this.peek().type === type; }

  match(...types) {
    for (const type of types) {
      if (this.check(type)) { this.advance(); return true; }
    }
    return false;
  }

  consume(type, message) {
    if (this.check(type)) return this.advance();
    throw new SyntaxError(`${message} at line ${this.peek().line}`);
  }
}

module.exports = { Parser };