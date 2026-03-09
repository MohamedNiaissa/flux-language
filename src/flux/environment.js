/**
 * Stores named pipeline declarations so they can be reused via the pipe operator.
 *
 *   pipeline traiter_commandes debut … fin   ← define('traiter_commandes', decl)
 *   source fichier("x.csv") | traiter_commandes;  ← get('traiter_commandes')
 */
class Environment {
  constructor() {
    /** @type {Map<string, import('./ast_nodes').PipelineDeclaration>} */
    this.store = new Map();
  }

  /** @param {string} name  @param {*} value */
  define(name, value) {
    this.store.set(name, value);
  }

  /** @param {string} name @returns {*} */
  get(name) {
    if (this.store.has(name)) return this.store.get(name);
    throw new ReferenceError(`Pipeline non défini : '${name}'`);
  }
}

module.exports = { Environment };
