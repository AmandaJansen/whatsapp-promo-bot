/**
 * Formata o texto da mensagem para postagem no canal/grupo do WhatsApp
 * @param {Object} produto
 * @param {string} produto.titulo
 * @param {string} [produto.preco]
 * @param {string} [produto.precoOriginal]
 * @param {string} [produto.desconto]
 * @param {string} [produto.cupom]
 * @param {string} produto.link
 * @param {string} [produto.loja]
 * @returns {string}
 */
function formatarMensagemPromocao(produto) {
  const lojaNome = {
    amazon: 'Amazon',
    mercadolivre: 'Mercado Livre',
    shopee: 'Shopee',
    generic: 'Loja Oficial'
  }[produto.loja || 'generic'] || 'Loja Oficial';

  const linhas = [];

  linhas.push(`🔥 *OFERTA IMPERDÍVEL* | *${lojaNome.toUpperCase()}*`);
  linhas.push('');
  linhas.push(`📦 *${produto.titulo.trim()}*`);
  linhas.push('');

  if (produto.precoOriginal && produto.preco && produto.precoOriginal !== produto.preco) {
    linhas.push(`❌ De: ~R$ ${produto.precoOriginal}~`);
    linhas.push(`✅ *Por apenas: R$ ${produto.preco}*` + (produto.desconto ? ` _(${produto.desconto})_` : ''));
  } else if (produto.preco) {
    linhas.push(`💥 *Por apenas: R$ ${produto.preco}*` + (produto.desconto ? ` _(${produto.desconto})_` : ''));
  }

  if (produto.cupom) {
    linhas.push('');
    linhas.push(`🎟️ Cupom: \`${produto.cupom.trim()}\``);
  }

  linhas.push('');
  linhas.push(`🛒 *Garanta aqui:*`);
  linhas.push(`${produto.link}`);
  linhas.push('');
  linhas.push(`⚠️ _Preço sujeito a alteração a qualquer momento._`);

  return linhas.join('\n');
}

module.exports = {
  formatarMensagemPromocao
};
