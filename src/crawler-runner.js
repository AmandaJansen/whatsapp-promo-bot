const { conectarWhatsApp, enviarPromocao } = require('./whatsapp');
const { rastrearNovasOfertas } = require('./crawler');
const config = require('./config');

async function executarCrawlerManual() {
  console.log('🤖 [Rastreador Manual] Iniciando...');

  const ofertas = await rastrearNovasOfertas();

  if (ofertas.length === 0) {
    console.log('ℹ️ Nenhuma oferta nova encontrada para postar.');
    return;
  }

  console.log(`\n📲 Conectando ao WhatsApp para enviar ${ofertas.length} ofertas...`);
  const sock = await conectarWhatsApp();

  for (let i = 0; i < ofertas.length; i++) {
    const produto = ofertas[i];
    console.log(`\n🚀 [${i + 1}/${ofertas.length}] Enviando: ${produto.titulo}`);
    
    await enviarPromocao(sock, produto);

    if (i < ofertas.length - 1) {
      console.log(`⏳ Aguardando delay de segurança (${config.crawler.delaySeconds}s)...`);
      await new Promise((res) => setTimeout(res, config.crawler.delaySeconds * 1000));
    }
  }

  console.log('\n✅ Todas as ofertas foram publicadas com sucesso!');
  setTimeout(() => {
    process.exit(0);
  }, 3000);
}

executarCrawlerManual().catch((err) => {
  console.error('❌ Erro ao rodar rastreador:', err.message);
  process.exit(1);
});
