/**
 * Interpreter for the Flux language.
 *
 * Walks the AST produced by the Parser and executes each statement.
 *
 * Data model
 * ──────────
 * Each source api(...) fetches a dataset (array of records).
 * Each step transforms that array and passes it to the next step.
 *
 * Dependency injection (for tests)
 * ─────────────────────────────────
 *   const interpreter = new Interpreter({
 *     fetch:     mockFetch,
 *     print:     (line) => collected.push(line),
 *     writeFile: async (path, content) => { ... },
 *   });
 */

const fs = require('fs');

const {
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
} = require('./ast_nodes');

const { TokenType } = require('./tokens');
const { Environment } = require('./environment');

class Interpreter {
  /**
   * @param {{ fetch?: Function, print?: Function, writeFile?: Function }} options
   */
  constructor({
    fetch: fetchFn       = globalThis.fetch,
    print                = console.log,
    writeFile: writeFn   = fs.promises.writeFile,
  } = {}) {
    this.environment = new Environment();
    this.fetchFn     = fetchFn;
    this.print       = print;
    this.writeFn     = writeFn;
  }

  // ─── Entry point ────────────────────────────────────────────────────────────

  async interpret(program) {
    for (const stmt of program.statements) {
      await this.execute(stmt);
    }
  }

  // ─── Statement execution ─────────────────────────────────────────────────────

  async execute(stmt) {
    if (stmt instanceof PipelineDeclaration) {
      this.environment.define(stmt.name.lexeme, stmt);
      return;
    }

    if (stmt instanceof SourceStatement) {
      return await this.executeSource(stmt);
    }

    throw new Error(`Statement inconnu : ${stmt.constructor.name}`);
  }

  async executeSource(stmt) {
    const data = await this.loadSource(stmt.connector, stmt.arg);

    if (stmt.pipeTarget) {
      const pipeline = this.environment.get(stmt.pipeTarget.lexeme);
      return await this.executeSteps(pipeline.steps, data);
    }

    return await this.executeSteps(stmt.steps, data);
  }

  // ─── Source connectors ───────────────────────────────────────────────────────

  async loadSource(connector, arg) {
    if (connector.lexeme !== 'api') {
      throw new Error(
        `Connecteur '${connector.lexeme}' non supporté — utilisez 'source api(...)'`
      );
    }

    const response = await this.fetchFn(arg.value);
    if (!response.ok) {
      throw new Error(`Erreur API ${response.status} pour l'URL : ${arg.value}`);
    }

    const json = await response.json();
    return Array.isArray(json) ? json : [json];
  }

  // ─── Pipeline steps ──────────────────────────────────────────────────────────

  async executeSteps(steps, data) {
    let current = data;
    for (const step of steps) {
      current = await this.executeStep(step, current);
    }
    return current;
  }

  async executeStep(step, data) {
    // ── affiche ──────────────────────────────────────────────────────────────
    if (step instanceof DisplayStep) {
      this.print(JSON.stringify(data, null, 2));
      return data;
    }

    // ── sauvegarde "filename.json" ────────────────────────────────────────────
    if (step instanceof SaveStep) {
      await this.writeFn(step.filename.lexeme, JSON.stringify(data, null, 2));
      return data;
    }

    // ── extrait [field1, field2, …] ──────────────────────────────────────────
    if (step instanceof ExtractStep) {
      const keys = step.fields.map(f => f.lexeme);
      return data.map(row => {
        const picked = {};
        for (const key of keys) picked[key] = row[key];
        return picked;
      });
    }

    // ── filtre condition ─────────────────────────────────────────────────────
    if (step instanceof FilterStep) {
      return data.filter(row => this.evalCondition(step.condition, row));
    }

    // ── transforme field est expression ─────────────────────────────────────
    if (step instanceof TransformStep) {
      const key = step.field.lexeme;
      return data.map(row => ({
        ...row,
        [key]: this.evalExpression(step.expression, row),
      }));
    }

    throw new Error(`Step inconnu : ${step.constructor.name}`);
  }

  // ─── Condition evaluation ────────────────────────────────────────────────────

  evalCondition(condition, row) {
    if (condition instanceof Comparison) {
      const left  = row[condition.field.lexeme];
      const right = this.evalPrimary(condition.right);

      switch (condition.operator.type) {
        case TokenType.EQUAL_EQUAL:   return left === right;
        case TokenType.BANG_EQUAL:    return left !== right;
        case TokenType.LESS:          return left <   right;
        case TokenType.LESS_EQUAL:    return left <=  right;
        case TokenType.GREATER:       return left >   right;
        case TokenType.GREATER_EQUAL: return left >=  right;
        default:
          throw new Error(`Opérateur inconnu : ${condition.operator.lexeme}`);
      }
    }

    if (condition instanceof CompoundCondition) {
      const left  = this.evalCondition(condition.left,  row);
      const right = this.evalCondition(condition.right, row);
      if (condition.logical.type === TokenType.ET) return left && right;
      if (condition.logical.type === TokenType.OU) return left || right;
    }

    throw new Error(`Condition inconnue : ${condition.constructor.name}`);
  }

  // ─── Expression evaluation ───────────────────────────────────────────────────

  evalExpression(expr, row) {
    if (expr instanceof BinaryExpr) {
      const left  = this.evalExpression(expr.left,  row);
      const right = this.evalExpression(expr.right, row);

      switch (expr.operator.type) {
        case TokenType.PLUS:  return left + right;
        case TokenType.MINUS: return left - right;
        case TokenType.STAR:  return left * right;
        case TokenType.SLASH: return left / right;
        default:
          throw new Error(`Opérateur inconnu : ${expr.operator.lexeme}`);
      }
    }

    if (expr instanceof FieldRef) return row[expr.token.lexeme];

    return this.evalPrimary(expr);
  }

  // ─── Primary (leaf) evaluation ────────────────────────────────────────────────

  evalPrimary(node) {
    if (node instanceof NumberLiteral) return node.value;
    if (node instanceof StringLiteral) return node.value;
    if (node instanceof BoolLiteral)   return node.value;
    throw new Error(`Primaire inconnu : ${node.constructor.name}`);
  }
}

module.exports = { Interpreter };