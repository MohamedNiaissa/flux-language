/**
 * AST nodes for the Flux language.
 *
 * Grammar (summary):
 *
 *   program         → statement* EOF
 *   statement       → pipelineDecl | sourceStatement
 *   pipelineDecl    → PIPELINE IDENTIFIER DEBUT step+ FIN
 *   sourceStatement → SOURCE IDENTIFIER LPAREN sourceArg RPAREN step* (PIPE IDENTIFIER)? SEMICOLON
 *   sourceArg       → STRING | LBRACKET (primary (COMMA primary)*)? RBRACKET
 *   step            → PUIS operation
 *   operation       → EXTRAIT LBRACKET IDENTIFIER (COMMA IDENTIFIER)* RBRACKET
 *                   | FILTRE condition
 *                   | TRANSFORME IDENTIFIER EST expression
 *                   | AFFICHE
 *                   | SAUVEGARDE STRING
 *   condition       → comparison ((ET | OU) comparison)*
 *   comparison      → IDENTIFIER compOp primary
 *   expression      → term ((PLUS | MINUS) term)*
 *   term            → factor ((STAR | SLASH) factor)*
 *   primary         → NUMBER | STRING | VRAI | FAUX | IDENTIFIER
 */

// ─── Root ────────────────────────────────────────────────────────────────────

class Program {
  /** @param {Array<SourceStatement|PipelineDeclaration>} statements */
  constructor(statements) {
    this.statements = statements;
  }
}

// ─── Statements ───────────────────────────────────────────────────────────────

/**
 * source fichier("produits.csv")
 *   puis extrait [nom, prix]
 *   puis affiche;
 *
 * source fichier("commandes.csv") | traiter_commandes;
 */
class SourceStatement {
  /**
   * @param {Token}                   connector   — 'fichier' | 'api' | 'liste'
   * @param {StringLiteral|ListLiteral} arg       — argument passed to the connector
   * @param {Array<Step>}             steps       — puis … operations
   * @param {Token|null}              pipeTarget  — identifier after | (or null)
   */
  constructor(connector, arg, steps, pipeTarget) {
    this.connector  = connector;
    this.arg        = arg;
    this.steps      = steps;
    this.pipeTarget = pipeTarget;
  }
}

/**
 * pipeline traiter_commandes debut
 *   puis extrait [client, montant]
 *   puis affiche;
 * fin
 */
class PipelineDeclaration {
  /**
   * @param {Token}        name   — pipeline identifier
   * @param {Array<Step>}  steps  — puis … operations
   */
  constructor(name, steps) {
    this.name  = name;
    this.steps = steps;
  }
}

// ─── Steps ────────────────────────────────────────────────────────────────────

/** puis extrait [field1, field2, …] */
class ExtractStep {
  /** @param {Array<Token>} fields */
  constructor(fields) {
    this.fields = fields;
  }
}

/** puis filtre condition */
class FilterStep {
  /** @param {Comparison|CompoundCondition} condition */
  constructor(condition) {
    this.condition = condition;
  }
}

/** puis transforme field est expression */
class TransformStep {
  /**
   * @param {Token}       field
   * @param {Expression}  expression
   */
  constructor(field, expression) {
    this.field      = field;
    this.expression = expression;
  }
}

/** puis affiche */
class DisplayStep {}

/** puis sauvegarde "filename" */
class SaveStep {
  /** @param {Token} filename — the STRING token */
  constructor(filename) {
    this.filename = filename;
  }
}

// ─── Conditions ───────────────────────────────────────────────────────────────

/**
 * A single comparison: field op value
 * e.g.  prix < 50  |  statut == "validée"  |  actif == vrai
 */
class Comparison {
  /**
   * @param {Token}    field    — IDENTIFIER token
   * @param {Token}    operator — comparison operator token
   * @param {Primary}  right    — right-hand side value
   */
  constructor(field, operator, right) {
    this.field    = field;
    this.operator = operator;
    this.right    = right;
  }
}

/**
 * Two conditions joined by ET or OU.
 * e.g.  age >= 18 et abonne == vrai
 */
class CompoundCondition {
  /**
   * @param {Comparison|CompoundCondition} left
   * @param {Token}                        logical — ET or OU token
   * @param {Comparison|CompoundCondition} right
   */
  constructor(left, logical, right) {
    this.left    = left;
    this.logical = logical;
    this.right   = right;
  }
}

// ─── Expressions (used in transforme) ─────────────────────────────────────────

/**
 * Binary arithmetic expression.
 * e.g.  prix * 1.2  |  montant + 100
 */
class BinaryExpr {
  /**
   * @param {Expression} left
   * @param {Token}      operator — PLUS | MINUS | STAR | SLASH
   * @param {Expression} right
   */
  constructor(left, operator, right) {
    this.left     = left;
    this.operator = operator;
    this.right    = right;
  }
}

// ─── Primaries (leaves) ───────────────────────────────────────────────────────

/** A numeric literal: 42, 1.2, 0.85 */
class NumberLiteral {
  /** @param {number} value */
  constructor(value) {
    this.value = value;
  }
}

/** A string literal: "Paris", "EUR" */
class StringLiteral {
  /** @param {string} value — already unquoted */
  constructor(value) {
    this.value = value;
  }
}

/** A boolean literal: vrai | faux */
class BoolLiteral {
  /** @param {boolean} value */
  constructor(value) {
    this.value = value;
  }
}

/** A field/variable reference: prix, montant, ville */
class FieldRef {
  /** @param {Token} token */
  constructor(token) {
    this.token = token;
  }
}

/** A list literal used as source arg: [340, 12, 89] */
class ListLiteral {
  /** @param {Array<NumberLiteral|StringLiteral|BoolLiteral>} elements */
  constructor(elements) {
    this.elements = elements;
  }
}

module.exports = {
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
};