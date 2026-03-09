const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { Lexer } = require('../lexer');
const { Parser } = require('../parser');
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
} = require('../ast_nodes');

// ─── helpers ─────────────────────────────────────────────────────────────────

function parse(source) {
  const tokens = new Lexer(source).tokenize();
  return new Parser(tokens).parse();
}

// ─── source fichier + puis affiche ───────────────────────────────────────────

describe('source fichier + puis affiche', () => {
  it('parses into a SourceStatement with one DisplayStep', () => {
    const ast = parse('source fichier("produits.csv")\n     puis affiche;');

    assert.ok(ast instanceof Program);
    assert.strictEqual(ast.statements.length, 1);

    const stmt = ast.statements[0];
    assert.ok(stmt instanceof SourceStatement);
    assert.strictEqual(stmt.connector.lexeme, 'fichier');
    assert.ok(stmt.arg instanceof StringLiteral);
    assert.strictEqual(stmt.arg.value, 'produits.csv');
    assert.strictEqual(stmt.pipeTarget, null);

    assert.strictEqual(stmt.steps.length, 1);
    assert.ok(stmt.steps[0] instanceof DisplayStep);
  });
});

// ─── source api ──────────────────────────────────────────────────────────────

describe('source api', () => {
  it('parses the API URL as a StringLiteral', () => {
    const ast = parse('source api("https://api.exemple.com/utilisateurs")\n     puis affiche;');
    const stmt = ast.statements[0];

    assert.strictEqual(stmt.connector.lexeme, 'api');
    assert.ok(stmt.arg instanceof StringLiteral);
    assert.strictEqual(stmt.arg.value, 'https://api.exemple.com/utilisateurs');
    assert.ok(stmt.steps[0] instanceof DisplayStep);
  });
});

// ─── source liste ─────────────────────────────────────────────────────────────

describe('source liste', () => {
  it('parses a numeric list as ListLiteral', () => {
    const ast = parse('source liste([340, 12, 89])\n     puis affiche;');
    const stmt = ast.statements[0];

    assert.strictEqual(stmt.connector.lexeme, 'liste');
    assert.ok(stmt.arg instanceof ListLiteral);
    assert.strictEqual(stmt.arg.elements.length, 3);
    assert.deepStrictEqual(
      stmt.arg.elements.map(e => e.value),
      [340, 12, 89]
    );
  });
});

// ─── puis extrait ─────────────────────────────────────────────────────────────

describe('puis extrait', () => {
  it('parses an extrait step with field names', () => {
    const ast = parse('source fichier("employes.csv")\n     puis extrait [nom, salaire, ville]\n     puis affiche;');
    const stmt = ast.statements[0];

    assert.strictEqual(stmt.steps.length, 2);
    const extract = stmt.steps[0];
    assert.ok(extract instanceof ExtractStep);
    assert.deepStrictEqual(
      extract.fields.map(f => f.lexeme),
      ['nom', 'salaire', 'ville']
    );
  });
});

// ─── puis filtre – simple comparison ─────────────────────────────────────────

describe('puis filtre – simple comparison', () => {
  it('parses prix < 50 into a FilterStep with a Comparison', () => {
    const ast = parse('source fichier("produits.csv")\n     puis filtre prix < 50\n     puis affiche;');
    const filter = ast.statements[0].steps[0];

    assert.ok(filter instanceof FilterStep);
    const cond = filter.condition;
    assert.ok(cond instanceof Comparison);
    assert.strictEqual(cond.field.lexeme, 'prix');
    assert.strictEqual(cond.operator.lexeme, '<');
    assert.ok(cond.right instanceof NumberLiteral);
    assert.strictEqual(cond.right.value, 50);
  });
});

// ─── puis filtre – ET compound ────────────────────────────────────────────────

describe('puis filtre – ET compound', () => {
  it('parses age >= 18 et abonne == vrai into a CompoundCondition', () => {
    const ast = parse('source fichier("clients.csv")\n     puis filtre age >= 18 et abonne == vrai\n     puis affiche;');
    const filter = ast.statements[0].steps[0];

    assert.ok(filter instanceof FilterStep);
    const cond = filter.condition;
    assert.ok(cond instanceof CompoundCondition);
    assert.strictEqual(cond.logical.lexeme, 'et');

    // left: age >= 18
    assert.ok(cond.left instanceof Comparison);
    assert.strictEqual(cond.left.field.lexeme, 'age');
    assert.strictEqual(cond.left.operator.lexeme, '>=');
    assert.ok(cond.left.right instanceof NumberLiteral);
    assert.strictEqual(cond.left.right.value, 18);

    // right: abonne == vrai
    assert.ok(cond.right instanceof Comparison);
    assert.strictEqual(cond.right.field.lexeme, 'abonne');
    assert.strictEqual(cond.right.operator.lexeme, '==');
    assert.ok(cond.right.right instanceof BoolLiteral);
    assert.strictEqual(cond.right.right.value, true);
  });
});

// ─── puis filtre – OU compound ────────────────────────────────────────────────

describe('puis filtre – OU compound', () => {
  it('parses ville == "Paris" ou ville == "Lyon"', () => {
    const ast = parse('source fichier("stocks.csv")\n     puis filtre ville == "Paris" ou ville == "Lyon"\n     puis affiche;');
    const cond = ast.statements[0].steps[0].condition;

    assert.ok(cond instanceof CompoundCondition);
    assert.strictEqual(cond.logical.lexeme, 'ou');

    assert.ok(cond.left.right instanceof StringLiteral);
    assert.strictEqual(cond.left.right.value, 'Paris');

    assert.ok(cond.right.right instanceof StringLiteral);
    assert.strictEqual(cond.right.right.value, 'Lyon');
  });
});

// ─── puis filtre – != and faux ────────────────────────────────────────────────

describe('puis filtre – != and faux', () => {
  it('parses statut != "annulée"', () => {
    const ast = parse('source fichier("commandes.csv")\n     puis filtre statut != "annulée"\n     puis affiche;');
    const cond = ast.statements[0].steps[0].condition;

    assert.ok(cond instanceof Comparison);
    assert.strictEqual(cond.operator.lexeme, '!=');
    assert.ok(cond.right instanceof StringLiteral);
    assert.strictEqual(cond.right.value, 'annulée');
  });

  it('parses bloque == faux into a BoolLiteral(false)', () => {
    const ast = parse('source fichier("comptes.csv")\n     puis filtre bloque == faux\n     puis affiche;');
    const cond = ast.statements[0].steps[0].condition;

    assert.ok(cond.right instanceof BoolLiteral);
    assert.strictEqual(cond.right.value, false);
  });
});

// ─── puis transforme ─────────────────────────────────────────────────────────

describe('puis transforme', () => {
  it('parses prix est prix * 1.2 into a TransformStep with BinaryExpr', () => {
    const ast = parse('source fichier("catalogue.csv")\n     puis transforme prix est prix * 1.2\n     puis affiche;');
    const step = ast.statements[0].steps[0];

    assert.ok(step instanceof TransformStep);
    assert.strictEqual(step.field.lexeme, 'prix');

    const expr = step.expression;
    assert.ok(expr instanceof BinaryExpr);
    assert.strictEqual(expr.operator.lexeme, '*');
    assert.ok(expr.left instanceof FieldRef);
    assert.strictEqual(expr.left.token.lexeme, 'prix');
    assert.ok(expr.right instanceof NumberLiteral);
    assert.strictEqual(expr.right.value, 1.2);
  });

  it('parses devise est "EUR" into a TransformStep with StringLiteral', () => {
    const ast = parse('source fichier("ventes.csv")\n     puis transforme devise est "EUR"\n     puis affiche;');
    const step = ast.statements[0].steps[0];

    assert.ok(step instanceof TransformStep);
    assert.strictEqual(step.field.lexeme, 'devise');
    assert.ok(step.expression instanceof StringLiteral);
    assert.strictEqual(step.expression.value, 'EUR');
  });
});

// ─── puis sauvegarde ─────────────────────────────────────────────────────────

describe('puis sauvegarde', () => {
  it('parses sauvegarde "meteo.json" into a SaveStep', () => {
    const ast = parse('source api("https://api.exemple.com/meteo")\n     puis extrait [ville, temperature, date]\n     puis sauvegarde "meteo.json";');
    const steps = ast.statements[0].steps;

    assert.ok(steps[0] instanceof ExtractStep);
    const save = steps[1];
    assert.ok(save instanceof SaveStep);
    assert.strictEqual(save.filename.lexeme, 'meteo.json');
  });
});

// ─── pipeline / debut / fin ───────────────────────────────────────────────────

describe('pipeline declaration', () => {
  it('parses a named pipeline with multiple steps', () => {
    const src = [
      'pipeline traiter_commandes debut',
      '     puis extrait [client, montant, statut]',
      '     puis filtre statut == "validée"',
      '     puis transforme montant est montant * 0.9',
      '     puis sauvegarde "commandes_traitees.json";',
      'fin',
    ].join('\n');

    const ast = parse(src);
    assert.strictEqual(ast.statements.length, 1);

    const decl = ast.statements[0];
    assert.ok(decl instanceof PipelineDeclaration);
    assert.strictEqual(decl.name.lexeme, 'traiter_commandes');
    assert.strictEqual(decl.steps.length, 4);

    assert.ok(decl.steps[0] instanceof ExtractStep);
    assert.ok(decl.steps[1] instanceof FilterStep);
    assert.ok(decl.steps[2] instanceof TransformStep);
    assert.ok(decl.steps[3] instanceof SaveStep);
  });
});

// ─── pipe operator | ─────────────────────────────────────────────────────────

describe('pipe operator', () => {
  it('parses source | pipeline_name as a SourceStatement with pipeTarget', () => {
    const ast = parse('source fichier("commandes_janvier.csv") | traiter_commandes;');
    const stmt = ast.statements[0];

    assert.ok(stmt instanceof SourceStatement);
    assert.strictEqual(stmt.steps.length, 0);
    assert.ok(stmt.pipeTarget !== null);
    assert.strictEqual(stmt.pipeTarget.lexeme, 'traiter_commandes');
  });
});

// ─── multiple statements ──────────────────────────────────────────────────────

describe('multiple statements', () => {
  it('parses a pipeline declaration followed by two source | pipe calls', () => {
    const src = [
      'pipeline traiter_commandes debut',
      '     puis extrait [client, montant, statut]',
      '     puis filtre statut == "validée"',
      '     puis sauvegarde "out.json";',
      'fin',
      'source fichier("commandes_janvier.csv") | traiter_commandes;',
      'source fichier("commandes_fevrier.csv") | traiter_commandes;',
    ].join('\n');

    const ast = parse(src);
    assert.strictEqual(ast.statements.length, 3);
    assert.ok(ast.statements[0] instanceof PipelineDeclaration);
    assert.ok(ast.statements[1] instanceof SourceStatement);
    assert.ok(ast.statements[2] instanceof SourceStatement);

    assert.strictEqual(ast.statements[1].pipeTarget.lexeme, 'traiter_commandes');
    assert.strictEqual(ast.statements[2].pipeTarget.lexeme, 'traiter_commandes');
  });
});

// ─── full example ─────────────────────────────────────────────────────────────

describe('full example', () => {
  it('parses a complex pipeline with all step types', () => {
    const src = [
      'source api("https://api.exemple.com/ventes")',
      '     puis extrait [vendeur, produit, montant, region, valide]',
      '     puis filtre valide == vrai et montant > 0',
      '     puis filtre region == "Nord" ou region == "Sud"',
      '     puis transforme montant est montant * 0.85',
      '     puis sauvegarde "ventes_finales.json";',
    ].join('\n');

    const ast = parse(src);
    const stmt = ast.statements[0];

    assert.ok(stmt instanceof SourceStatement);
    assert.strictEqual(stmt.connector.lexeme, 'api');
    assert.strictEqual(stmt.steps.length, 5);

    assert.ok(stmt.steps[0] instanceof ExtractStep);
    assert.strictEqual(stmt.steps[0].fields.length, 5);

    assert.ok(stmt.steps[1] instanceof FilterStep);
    assert.ok(stmt.steps[1].condition instanceof CompoundCondition);

    assert.ok(stmt.steps[2] instanceof FilterStep);
    assert.ok(stmt.steps[2].condition instanceof CompoundCondition);

    assert.ok(stmt.steps[3] instanceof TransformStep);
    assert.ok(stmt.steps[3].expression instanceof BinaryExpr);

    assert.ok(stmt.steps[4] instanceof SaveStep);
  });
});