const fs = require('fs');
const config = require('./config');

/**
 * Lê o banco de dados JSON local
 * @returns {{ posted: Record<string, { timestamp: number, title?: string }> }}
 */
function lerBanco() {
  try {
    if (!fs.existsSync(config.databasePath)) {
      const initial = { posted: {} };
      fs.writeFileSync(config.databasePath, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    const raw = fs.readFileSync(config.databasePath, 'utf-8');
    return JSON.parse(raw) || { posted: {} };
  } catch (err) {
    return { posted: {} };
  }
}

/**
 * Salva os dados no arquivo JSON
 * @param {Object} data
 */
function salvarBanco(data) {
  try {
    fs.writeFileSync(config.databasePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Erro ao salvar database.json:', err.message);
  }
}

/**
 * Normaliza uma chave identificadora para evitar duplicidade
 * @param {string} urlOuId
 * @returns {string}
 */
function normalizarChave(urlOuId) {
  try {
    const urlObj = new URL(urlOuId);
    return `${urlObj.hostname}${urlObj.pathname}`.toLowerCase();
  } catch {
    return urlOuId.toLowerCase().trim();
  }
}

/**
 * Verifica se um produto já foi postado
 * @param {string} urlOuId
 * @returns {boolean}
 */
function jaFoiPostado(urlOuId) {
  const db = lerBanco();
  const chave = normalizarChave(urlOuId);
  return Boolean(db.posted && db.posted[chave]);
}

/**
 * Registra que um produto foi postado
 * @param {string} urlOuId
 * @param {Object} [metadata]
 */
function marcarComoPostado(urlOuId, metadata = {}) {
  const db = lerBanco();
  const chave = normalizarChave(urlOuId);
  if (!db.posted) db.posted = {};
  db.posted[chave] = {
    timestamp: Date.now(),
    ...metadata
  };
  salvarBanco(db);
}

module.exports = {
  jaFoiPostado,
  marcarComoPostado
};
