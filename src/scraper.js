const axios = require('axios');
const cheerio = require('cheerio');
const { identificarLoja, gerarLinkAfiliado } = require('./affiliate');

const HTTP_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
};

/**
 * Extrai informações detalhadas de um produto a partir de uma URL
 * @param {string} url
 * @returns {Promise<{titulo: string, preco?: string, precoOriginal?: string, desconto?: string, imagem?: string, link: string, loja: string}>}
 */
async function extrairInfoProduto(url) {
  if (!url) {
    throw new Error('URL não fornecida.');
  }

  const loja = identificarLoja(url);

  try {
    // 1. Faz a requisição HTTP com timeout de 15s e seguindo redirecionamentos
    const response = await axios.get(url, {
      headers: HTTP_HEADERS,
      timeout: 15000,
      maxRedirects: 5
    });

    // Pega a URL final caso tenha havido redirecionamento
    const urlFinal = response.request?.res?.responseUrl || url;
    const html = response.data;
    const $ = cheerio.load(html);

    // 2. Extração de Título
    let titulo = $('meta[property="og:title"]').attr('content') ||
                 $('meta[name="twitter:title"]').attr('content') ||
                 $('#productTitle').text() ||
                 $('.ui-pdp-title').text() ||
                 $('h1').first().text() ||
                 $('title').text();

    titulo = (titulo || 'Produto em Promoção')
      .replace(/\s+/g, ' ')
      .replace(/\s*\|\s*Mercado Livre.*$/i, '')
      .replace(/\s*\|\s*Amazon\.com\.br.*$/i, '')
      .replace(/\s*\|\s*Shopee Brasil.*$/i, '')
      .trim();

    // 3. Extração de Imagem
    let imagem = $('meta[property="og:image"]').attr('content') ||
                 $('meta[name="twitter:image"]').attr('content') ||
                 $('#landingImage').attr('src') ||
                 $('.ui-pdp-gallery__figure img').first().attr('src') ||
                 $('.ui-pdp-image').first().attr('src');

    // 4. Extração de Preços
    let preco = '';
    let precoOriginal = '';
    let desconto = '';

    if (loja === 'mercadolivre') {
      const precoFracao = $('.ui-pdp-price__second-line .andes-money-amount__fraction').first().text().trim();
      const precoCents = $('.ui-pdp-price__second-line .andes-money-amount__cents').first().text().trim();
      if (precoFracao) {
        preco = precoCents ? `${precoFracao},${precoCents}` : precoFracao;
      }

      const origFracao = $('.ui-pdp-price__original-value .andes-money-amount__fraction').first().text().trim();
      if (origFracao) {
        precoOriginal = origFracao;
      }

      const descText = $('.ui-pdp-price__second-line .andes-money-amount__discount').first().text().trim();
      if (descText) desconto = descText;
    } else if (loja === 'amazon') {
      const precoInteiro = $('.a-price .a-price-whole').first().text().replace(/[^\d]/g, '').trim();
      const precoFracao = $('.a-price .a-price-fraction').first().text().trim();
      if (precoInteiro) {
        preco = precoFracao ? `${precoInteiro},${precoFracao}` : precoInteiro;
      }

      const origPreco = $('.basisPrice .a-offscreen, .a-text-price .a-offscreen').first().text().replace(/[^\d,\.]/g, '').trim();
      if (origPreco && origPreco !== preco) {
        precoOriginal = origPreco;
      }

      const descText = $('.savingsPercentage').first().text().trim();
      if (descText) desconto = descText;
    }

    // Fallback de preço via OpenGraph
    if (!preco) {
      const ogPrice = $('meta[property="product:price:amount"]').attr('content') ||
                      $('meta[property="og:price:amount"]').attr('content');
      if (ogPrice) {
        preco = ogPrice.replace('.', ',');
      }
    }

    // 5. Gera o link com a tag de afiliado
    const linkAfiliado = gerarLinkAfiliado(urlFinal);

    return {
      titulo,
      preco,
      precoOriginal,
      desconto,
      imagem,
      link: linkAfiliado,
      loja
    };
  } catch (error) {
    // Se o scraping falhar (ex: bloqueio anti-bot pontual), retorna estrutura básica com o link de afiliado
    const linkAfiliado = gerarLinkAfiliado(url);
    return {
      titulo: 'Oferta Especial',
      preco: '',
      precoOriginal: '',
      desconto: '',
      imagem: '',
      link: linkAfiliado,
      loja
    };
  }
}

module.exports = {
  extrairInfoProduto
};
