const cron = require('node-cron');
const { conectarWhatsApp, enviarPromocao } = require('./whatsapp');
const { rastrearNovasOfertas } = require('./crawler');
const { iniciarServidorHttp } = require('./server');
const config = require('./config');

let isRunning = false;

async function cicloDeRastreamento(sock) {
  if (isRunning) {
    console.log('⏳ Ciclo anterior ainda em execução. Aguardando próximo horário...');
    return;
  }

  isRunning = true;
  try {
    console.log(`\n⏰ [${new Date().toLocaleTimeString()}] Iniciando verificação de ofertas...`);
    const ofertas = await rastrearNovasOfertas(config.crawler.maxDealsPerRun);

    if (ofertas.length === 0) {
      console.log('ℹ️ Nenhuma oferta inédita nesta rodada.');
      return;
    }

    console.log(`📢 ${ofertas.length} novas ofertas prontas para envio.`);

    for (let i = 0; i < ofertas.length; i++) {
      const produto = ofertas[i];
      await enviarPromocao(sock, produto);

      if (i < ofertas.length - 1) {
        console.log(`⏳ Aguardando delay de segurança de ${config.crawler.delaySeconds}s...`);
        await new Promise((res) => setTimeout(res, config.crawler.delaySeconds * 1000));
      }
    }
  } catch (err) {
    console.error('❌ Erro no ciclo de rastreamento:', err.message);
  } finally {
    isRunning = false;
  }
}

async function iniciarServico() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 BOT DE PROMOÇÕES & AFILIADOS (WHATSAPP CANAIS)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`• Agendamento: ${config.crawler.cronSchedule}`);
  console.log(`• Máx. ofertas/ciclo: ${config.crawler.maxDealsPerRun}`);
  console.log(`• Delay entre envios: ${config.crawler.delaySeconds}s`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Inicia o servidor HTTP para a nuvem (Render, Koyeb, etc.)
  iniciarServidorHttp();

  // 2. Conecta ao WhatsApp
  console.log('📲 Conectando ao WhatsApp...');
  const sock = await conectarWhatsApp();

  // 3. Executa uma rodada inicial após 10 segundos da conexão
  console.log('⏳ Executando primeira rodada de verificação em 10 segundos...');
  setTimeout(() => {
    cicloDeRastreamento(sock);
  }, 10000);

  // 4. Agenda as próximas rodadas
  cron.schedule(config.crawler.cronSchedule, () => {
    cicloDeRastreamento(sock);
  });

  console.log(`\n✅ Serviço ativo e monitorando ofertas automaticamente! (Cron: ${config.crawler.cronSchedule})`);
}

iniciarServico().catch((err) => {
  console.error('❌ Erro fatal ao iniciar serviço:', err.message);
  process.exit(1);
});
