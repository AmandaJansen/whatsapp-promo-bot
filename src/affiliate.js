const config = require('./config');

/**
 * Identifica a loja a partir da URL
 * @param {string} urlStr
 * @returns {'amazon' | 'mercadolivre' | 'shopee' | 'generic'}
 */
function identificarLoja(urlStr) {
  if (!urlStr) return 'generic';
  const urlLower = urlStr.toLowerCase();
  if (urlLower.includes('amazon.com.br') || urlLower.includes('amzn.to') || urlLower.includes('amazon.com')) {
    return 'amazon';
  }
  if (urlLower.includes('mercadolivre.com') || urlLower.includes('produto.mercadolivre.com.br') || urlLower.includes('meli.la')) {
    return 'mercadolivre';
  }
  if (urlLower.includes('shopee.com.br') || urlLower.includes('s.shopee.com.br') || urlLower.includes('shp.ee')) {
    return 'shopee';
  }
  return 'generic';
}

/**
 * Converte uma URL normal em URL com parâmetros de afiliado
 * @param {string} urlOriginal
 * @returns {string}
 */
function gerarLinkAfiliado(urlOriginal) {
  if (!urlOriginal) return '';

  try {
    const loja = identificarLoja(urlOriginal);

    if (loja === 'amazon') {
      const tag = config.affiliates.amazonTag;
      if (!tag) return urlOriginal;

      // Extrai o ASIN (código único de produto Amazon: 10 caracteres alfanuméricos)
      const asinMatch = urlOriginal.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
      if (asinMatch && asinMatch[1]) {
        const asin = asinMatch[1].toUpperCase();
        return `https://www.amazon.com.br/dp/${asin}?tag=${encodeURIComponent(tag)}`;
      }

      // Se não encontrou ASIN direto, apenas adiciona ou atualiza a tag
      const parsed = new URL(urlOriginal);
      parsed.searchParams.set('tag', tag);
      return parsed.toString();
    }

    if (loja === 'mercadolivre') {
      const mlTag = config.affiliates.mlTag;
      if (!mlTag) return urlOriginal;

      const parsed = new URL(urlOriginal);
      // Parâmetro comum de atribuição do Mercado Livre Afiliados
      parsed.searchParams.set('matt_tool', mlTag);
      return parsed.toString();
    }

    if (loja === 'shopee') {
      const subId = config.affiliates.shopeeSubId;
      if (!subId) return urlOriginal;

      const parsed = new URL(urlOriginal);
      parsed.searchParams.set('af_sub_id', subId);
      return parsed.toString();
    }

    return urlOriginal;
  } catch (err) {
    console.error('Erro ao processar link de afiliado:', err.message);
    return urlOriginal;
  }
}

module.exports = {
  identificarLoja,
  gerarLinkAfiliado
};
