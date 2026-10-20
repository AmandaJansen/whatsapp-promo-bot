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
const { setQrCode, setPairingCode, setConnected } = require('./server');

/**
 * Converte links de canal (whatsapp.com/channel/XYZ) em JID real (@newsletter)
 * @param {any} sock
 * @param {string} jidOuUrl
 * @returns {Promise<string>}
 */
async function resolverJidDestino(sock, jidOuUrl) {
  if (!jidOuUrl) return '';

  const clean = jidOuUrl.trim();

  // Se já for um JID válido (@newsletter, @g.us ou @s.whatsapp.net)
  if (clean.includes('@newsletter') || clean.includes('@g.us') || clean.includes('@s.whatsapp.net')) {
    return clean;
  }

  // Se for um link de canal do WhatsApp
  if (clean.includes('whatsapp.com/channel/')) {
    try {
      const inviteCode = clean.split('whatsapp.com/channel/')[1].split('/')[0].split('?')[0];
      if (typeof sock.newsletterMetadata === 'function') {
        const metadata = await sock.newsletterMetadata('invite', inviteCode);
        if (metadata && metadata.id) {
          console.log(`📡 [Canal] Link resolvido para o JID: ${metadata.id}`);
          return metadata.id;
        }
      }
    } catch (err) {
      console.warn('⚠️ Não foi possível resolver o link do canal automaticamente:', err.message);
    }
  }

  return clean;
}

/**
 * Busca e lista todos os Canais e Grupos disponíveis na conta conectada
 * @param {any} sock
 * @returns {Promise<Array<{ nome: string, jid: string, tipo: string }>>}
 */
async function listarCanaisEGrupos(sock) {
  const lista = [];

  try {
    // 1. Busca Grupos
    if (typeof sock.groupFetchAllParticipating === 'function') {
      const grupos = await sock.groupFetchAllParticipating();
      for (const [jid, info] of Object.entries(grupos)) {
        lista.push({
          nome: info.subject || 'Grupo sem nome',
          jid,
          tipo: 'Grupo'
        });
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 CANAIS E GRUPOS DISPONÍVEIS NA SUA CONTA:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (lista.length === 0) {
      console.log('ℹ️ Nenhum grupo encontrado ou permissão pendente.');
    } else {
      lista.forEach((item) => {
        console.log(`• [${item.tipo}] ${item.nome} -> JID: ${item.jid}`);
      });
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (err) {
    console.warn('⚠️ Aviso ao listar grupos/canais:', err.message);
  }

  return lista;
}

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

  // Se não estiver registrado e tiver telefone configurado, solicita código de pareamento numérico de 8 dígitos
  if (!sock.authState.creds.registered && config.whatsapp.adminPhone) {
    const cleanPhone = config.whatsapp.adminPhone.replace(/[^0-9]/g, '');
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(cleanPhone);
        console.log(`\n🔑 CÓDIGO DE PAREAMENTO (8 dígitos): ${code}\n`);
        setPairingCode(code);
      } catch (err) {
        console.log('ℹ️ Código de pareamento numérico não solicitado, usando QR Code.');
      }
    }, 4000);
  }

  // Escuta de mensagens para controle direto pelo celular (WhatsApp Privado)
  sock.ev.on('messages.upsert', async (m) => {
    try {
      const msg = m.messages[0];
      if (!msg || !msg.message) return;

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

      // Comando de teste !ping ou !teste
      if (textoMensagem.toLowerCase() === '!ping' || textoMensagem.toLowerCase() === '!teste') {
        await sock.sendMessage(remoteJid, {
          text: `🤖 *PromoBot Online!*\n\n• Canal configurado: \`${config.whatsapp.channelJid || 'Não configurado'}\`\n• Envie o link de um produto aqui para postar!`
        });
        return;
      }

      // Verifica se a mensagem contém um link de loja suportada
      const urlRegex = /(https?:\/\/[^\s]+)/gi;
      const matchUrls = textoMensagem.match(urlRegex);

      if (matchUrls && matchUrls.length > 0) {
        const urlAlvo = matchUrls[0];
        
        // Verifica se é uma loja suportada
        const isLojaSuportada = /amazon|mercadolivre|shopee|amzn\.to|meli\.la|shp\.ee/i.test(urlAlvo);
        if (!isLojaSuportada) return;

        // Extrai cupom se fornecido após a URL ou comando cupom: XYZ
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
        setQrCode(qr);
        console.log('\n📲 QR CODE GERADO COM SUCESSO!');
        console.log('👉 Acesse a URL pública do seu app no navegador para escanear a imagem nítida.');
        try {
          qrcode.generate(qr, { small: true });
        } catch {}
      }

      if (connection === 'close') {
        setConnected(false);
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

        // Busca canais e grupos da conta
        const chats = await listarCanaisEGrupos(sock);
        setConnected(true, chats);

        // Envia mensagem de boas-vindas para o número do admin (se configurado)
        if (config.whatsapp.adminPhone) {
          const adminJid = `${config.whatsapp.adminPhone.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
          try {
            await sock.sendMessage(adminJid, {
              text: `🤖 *PromoBot Conectado com Sucesso!*\n\nO bot está ativo e pronto. Envie o link de qualquer produto (Amazon, Mercado Livre ou Shopee) aqui neste chat para divulgar no canal!`
            });
            console.log('💬 Mensagem de confirmação enviada para seu WhatsApp!');
          } catch (e) {
            console.log('ℹ️ Não foi possível enviar mensagem privada inicial:', e.message);
          }
        }

        resolve(sock);
      }
    });
  });
}

/**
 * Envia uma mensagem de promoção para o canal ou grupo configurado com suporte a fallback
 * @param {any} sock
 * @param {Object} produto
 * @param {string} [destinoJid]
 */
async function enviarPromocao(sock, produto, destinoJid = config.whatsapp.channelJid) {
  const jidFinal = await resolverJidDestino(sock, destinoJid);

  if (!jidFinal || jidFinal.includes('XXXXXXXXXXXX')) {
    console.error('\n⚠️ [Atenção] JID do Canal do WhatsApp inválido ou não configurado!');
    console.log('👉 Acesse a página web do seu app ou veja a lista acima para copiar o JID correto do seu canal.\n');
    throw new Error('JID do canal não configurado no .env (WHATSAPP_CHANNEL_JID).');
  }

  const texto = formatarMensagemPromocao(produto);

  try {
    // Tenta enviar com imagem se houver
    if (produto.imagem) {
      try {
        await sock.sendMessage(jidFinal, {
          image: { url: produto.imagem },
          caption: texto
        });
      } catch (imgError) {
        console.warn('⚠️ Falha ao carregar imagem externa. Enviando apenas o texto com link...');
        await sock.sendMessage(jidFinal, { text: texto });
      }
    } else {
      await sock.sendMessage(jidFinal, { text: texto });
    }

    // Registra no banco de dados local para não duplicar
    marcarComoPostado(produto.link, {
      titulo: produto.titulo,
      loja: produto.loja,
      preco: produto.preco
    });

    console.log(`🚀 [Sucesso] Promoção postada no canal (${jidFinal}): "${produto.titulo.substring(0, 40)}..."`);
  } catch (error) {
    console.error(`❌ [Erro] Falha ao enviar mensagem para ${jidFinal}:`, error.message);
    throw error;
  }
}

module.exports = {
  conectarWhatsApp,
  enviarPromocao,
  resolverJidDestino,
  listarCanaisEGrupos
};
