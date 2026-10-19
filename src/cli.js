const { conectarWhatsApp, enviarPromocao } = require('./whatsapp');
const { extrairInfoProduto } = require('./scraper');

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ CONVERSOR RELÂMPAGO DE PROMOÇÕES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Uso:
  npm run post -- "<URL_DO_PRODUTO>" [CUPOM_OPCIONAL]

Exemplos:
  npm run post -- "https://www.amazon.com.br/dp/B0CX23V2ZH"
  npm run post -- "https://produto.mercadolivre.com.br/MLB-123456" "DESCONTO10"
  npm run post -- "https://shopee.com.br/product/123/456"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
    process.exit(1);
  }

  const url = args[0];
  const cupom = args[1] || '';

  console.log(`\n⏳ Extraindo dados do produto: ${url}`);
  const produto = await extrairInfoProduto(url);

  if (cupom) {
    produto.cupom = cupom;
  }

  console.log('\n📦 DADOS EXTRAÍDOS:');
  console.log(`• Título: ${produto.titulo}`);
  console.log(`• Loja: ${produto.loja.toUpperCase()}`);
  console.log(`• Preço: ${produto.preco ? 'R$ ' + produto.preco : 'Não identificado'}`);
  console.log(`• Link Afiliado: ${produto.link}`);
  if (produto.imagem) console.log(`• Imagem: ${produto.imagem}`);
  if (produto.cupom) console.log(`• Cupom: ${produto.cupom}`);

  console.log('\n📲 Conectando ao WhatsApp...');
  const sock = await conectarWhatsApp();

  console.log('🚀 Enviando promoção para o canal...');
  await enviarPromocao(sock, produto);

  console.log('\n✅ Concluído com sucesso! Aguardando 3s antes de finalizar...');
  setTimeout(() => {
    process.exit(0);
  }, 3000);
}

main().catch((err) => {
  console.error('\n❌ Erro durante a execução:', err.message);
  process.exit(1);
});
