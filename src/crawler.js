const axios = require('axios');
const cheerio = require('cheerio');
const config = require('./config');
const { extrairInfoProduto } = require('./scraper');
const { jaFoiPostado } = require('./database');

const HTTP_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
};

/**
 * Coleta links de ofertas em destaque do Mercado Livre
 * @returns {Promise<string[]>}
 */
async function buscarOfertasMercadoLivre() {
  try {
    const url = 'https://www.mercadolivre.com.br/ofertas';
    const { data: html } = await axios.get(url, {
      headers: HTTP_HEADERS,
      timeout: 15000
    });

    const $ = cheerio.load(html);
    const links = new Set();

    // Seleciona links de cards de ofertas
    $('a[href*="/p/"], a[href*="produto.mercadolivre.com.br/MLB-"]').each((_, el) => {
      let href = $(el).attr('href');
      if (href) {
        // Limpa tracking desnecessário
        const cleanHref = href.split('#')[0].split('?')[0];
        if (cleanHref.includes('mercadolivre.com.br')) {
          links.add(cleanHref);
        }
      }
    });

    return Array.from(links);
  } catch (err) {
    console.error('⚠️ [Crawler ML] Erro ao buscar ofertas:', err.message);
    return [];
  }
}

/**
 * Coleta links de ofertas da Amazon Brasil
 * @returns {Promise<string[]>}
 */
async function buscarOfertasAmazon() {
  try {
    const url = 'https://www.amazon.com.br/deals';
    const { data: html } = await axios.get(url, {
      headers: HTTP_HEADERS,
      timeout: 15000
    });

    const $ = cheerio.load(html);
    const links = new Set();

    $('a[href*="/dp/"]').each((_, el) => {
      let href = $(el).attr('href');
      if (href) {
        const asinMatch = href.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
        if (asinMatch && asinMatch[1]) {
          links.add(`https://www.amazon.com.br/dp/${asinMatch[1]}`);
        }
      }
    });

    return Array.from(links);
  } catch (err) {
    console.error('⚠️ [Crawler Amazon] Erro ao buscar ofertas:', err.message);
    return [];
  }
}

/**
 * Rastreador principal: busca novas ofertas de todas as fontes e retorna produtos formatados
 * @param {number} [limite]
 * @returns {Promise<Array>}
 */
async function rastrearNovasOfertas(limite = config.crawler.maxDealsPerRun) {
  console.log('🔍 [Crawler] Iniciando busca por novas ofertas...');

  const [linksML, linksAmazon] = await Promise.all([
    buscarOfertasMercadoLivre(),
    buscarOfertasAmazon()
  ]);

  const todosLinks = [...linksML, ...linksAmazon];
  console.log(`📦 [Crawler] Total de ${todosLinks.length} ofertas candidatas encontradas.`);

  // Filtra apenas produtos que ainda não foram postados
  const linksNaoPostados = todosLinks.filter((link) => !jaFoiPostado(link));
  console.log(`✨ [Crawler] ${linksNaoPostados.length} ofertas inéditas para processar.`);

  const produtosParaPostar = [];

  for (const link of linksNaoPostados) {
    if (produtosParaPostar.length >= limite) break;

    try {
      console.log(`⏳ [Crawler] Extraindo dados de: ${link}`);
      const produto = await extrairInfoProduto(link);
      
      // Valida se o produto possui pelo menos título e link válidos
      if (produto && produto.titulo && produto.link) {
        produtosParaPostar.push(produto);
      }

      // Pequeno delay entre requisições de scraping
      await new Promise((res) => setTimeout(res, 2000));
    } catch (e) {
      console.error(`Erro ao processar produto ${link}:`, e.message);
    }
  }

  return produtosParaPostar;
}

module.exports = {
  rastrearNovasOfertas,
  buscarOfertasMercadoLivre,
  buscarOfertasAmazon
};
