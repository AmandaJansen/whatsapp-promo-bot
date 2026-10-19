const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const config = require('./config');
const { formatarMensagemPromocao } = require('./templates');
const { marcarComoPostado } = require('./database');
const { extrairInfoProduto } = require('./scraper');

/**
 * Inicia a conexão com o WhatsApp via Baileys e configura escuta de comandos
 * @returns {Promise<any>}
 */
async function conectarWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(config.whatsapp.sessionDir);
  const { version, isLatest } = await fetchLatestBaileysVersion();

  console.log(`📱 Usando WhatsApp Web v${version.join('.')} (Versão recente: ${isLatest})`);

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ['PromoBot Cloud', 'Chrome', '122.0.0']
  });

  sock.ev.on('creds.update', saveCreds);

  // Escuta de mensagens para controle direto pelo celular (WhatsApp Privado)
  sock.ev.on('messages.upsert', async (m) => {
    try {
      const msg = m.messages[0];
      if (!msg || !msg.message || msg.key.fromMe && !config.whatsapp.adminPhone) return;

      const remoteJid = msg.key.remoteJid;
      const textoMensagem = msg.message.conversation ||
                            msg.message.extendedTextMessage?.text ||
                            msg.message.imageMessage?.caption || '';

      if (!textoMensagem) return;

      // Valida remetente: deve ser do admin configurado ou mensagem enviada no chat próprio
      const senderPhone = remoteJid.replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '');
      const adminConfig = config.whatsapp.adminPhone.replace(/[^0-9]/g, '');

      const isAutorizado = (adminConfig && senderPhone.includes(adminConfig)) || msg.key.fromMe;

      if (!isAutorizado) return;

      // Verifica se a mensagem contém um link de loja suportada
      const urlRegex = /(https?:\/\/[^\s]+)/gi;
      const matchUrls = textoMensagem.match(urlRegex);

      if (matchUrls && matchUrls.length > 0) {
        const urlAlvo = matchUrls[0];
        
        // Verifica se é uma loja suportada
        const isLojaSuportada = /amazon|mercadolivre|shopee|amzn\.to|meli\.la|shp\.ee/i.test(urlAlvo);
        if (!isLojaSuportada) return;

        // Extrai cupom se fornecido após a URL ou comando !cupom
        const cupomMatch = textoMensagem.match(/(?:cupom|code|código)[:\s]+([A-Z0-9_-]+)/i);
        const cupom = cupomMatch ? cupomMatch[1] : '';

        console.log(`\n📲 [Controle Celular] Link recebido via WhatsApp: ${urlAlvo}`);
        await sock.sendMessage(remoteJid, {
          text: `⏳ *Processando link...*\nExtraindo dados e aplicando seu link de afiliado...`
        });

        const produto = await extrairInfoProduto(urlAlvo);
        if (cupom) produto.cupom = cupom;

        await enviarPromocao(sock, produto);

        await sock.sendMessage(remoteJid, {
          text: `✅ *Sucesso!*\nA promoção do produto *"${produto.titulo}"* foi publicada no canal!`
        });
      }
    } catch (err) {
      console.error('⚠️ Erro ao processar mensagem do WhatsApp:', err.message);
    }
  });

  return new Promise((resolve, reject) => {
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log('\n📲 ESCANEIE O QR CODE ABAIXO COM SEU WHATSAPP:\n');
        qrcode.generate(qr, { small: true });
        console.log('\nAbra o WhatsApp > Aparelhos conectados > Conectar um aparelho.\n');
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        console.log(`🔌 Conexão encerrada (status: ${statusCode}). Reconectando: ${shouldReconnect}`);

        if (shouldReconnect) {
          setTimeout(() => {
            conectarWhatsApp().then(resolve).catch(reject);
          }, 3000);
        } else {
          console.error('❌ Desconectado permanentemente (Logged out). Exclua a pasta session/ e gere novo QR.');
        }
      } else if (connection === 'open') {
        console.log('✅ Bot conectado ao WhatsApp com sucesso!');
        resolve(sock);
      }
    });
  });
}

/**
 * Envia uma mensagem de promoção para o canal ou grupo configurado
 * @param {any} sock
 * @param {Object} produto
 * @param {string} [destinoJid]
 */
async function enviarPromocao(sock, produto, destinoJid = config.whatsapp.channelJid) {
  if (!destinoJid) {
    throw new Error('JID de destino do WhatsApp não configurado no arquivo .env (WHATSAPP_CHANNEL_JID).');
  }

  const texto = formatarMensagemPromocao(produto);

  try {
    if (produto.imagem) {
      await sock.sendMessage(destinoJid, {
        image: { url: produto.imagem },
        caption: texto
      });
    } else {
      await sock.sendMessage(destinoJid, { text: texto });
    }

    // Registra no banco de dados local para não duplicar
    marcarComoPostado(produto.link, {
      titulo: produto.titulo,
      loja: produto.loja,
      preco: produto.preco
    });

    console.log(`🚀 [Sucesso] Promoção postada: "${produto.titulo.substring(0, 40)}..."`);
  } catch (error) {
    console.error(`❌ [Erro] Falha ao enviar mensagem para ${destinoJid}:`, error.message);
    throw error;
  }
}

module.exports = {
  conectarWhatsApp,
  enviarPromocao
};
