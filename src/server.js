const http = require('http');
const QRCode = require('qrcode');
const config = require('./config');

let currentQr = null;
let currentPairingCode = null;
let isConnected = false;

function setQrCode(qr) {
  currentQr = qr;
  isConnected = false;
}

function setPairingCode(code) {
  currentPairingCode = code;
}

function setConnected(status) {
  isConnected = status;
  if (status) {
    currentQr = null;
    currentPairingCode = null;
  }
}

/**
 * Inicia o servidor HTTP com página visual para escanear QR Code e Health Check
 * @param {number} port
 */
function iniciarServidorHttp(port = config.server.port) {
  const server = http.createServer(async (req, res) => {
    // Rota da API / Health Check
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: isConnected ? 'connected' : 'waiting_qr',
        uptime: process.uptime(),
        service: 'WhatsApp Promo Bot',
        timestamp: new Date().toISOString()
      }));
      return;
    }

    // Página Principal / Visualizador de QR Code e Pareamento
    if (req.url === '/' || req.url === '/qr') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });

      let qrImageHtml = '';
      if (currentQr) {
        try {
          const dataUrl = await QRCode.toDataURL(currentQr, {
            width: 320,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' }
          });
          qrImageHtml = `
            <div style="background: #ffffff; padding: 16px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
              <img src="${dataUrl}" alt="WhatsApp QR Code" style="display: block; width: 280px; height: 280px;" />
            </div>
            <p style="margin-top: 16px; color: #555; font-size: 14px;">
              Abra o WhatsApp no celular &gt; <b>Aparelhos conectados</b> &gt; <b>Conectar um aparelho</b> e aponte a câmera.
            </p>
            <p style="font-size: 12px; color: #888;">Esta página atualiza automaticamente a cada 5 segundos.</p>
          `;
        } catch (e) {
          qrImageHtml = `<p style="color: red;">Erro ao gerar imagem do QR Code: ${e.message}</p>`;
        }
      }

      const pairingHtml = currentPairingCode ? `
        <div style="background: #e7f5ff; border: 2px dashed #1c7ed6; border-radius: 12px; padding: 20px; margin: 20px auto; max-width: 360px;">
          <div style="font-size: 14px; color: #1864ab; font-weight: bold; margin-bottom: 8px;">CÓDIGO DE PAREAMENTO:</div>
          <div style="font-size: 32px; font-weight: 800; letter-spacing: 4px; color: #0b7285; font-family: monospace;">${currentPairingCode}</div>
          <div style="font-size: 13px; color: #495057; margin-top: 10px;">
            No WhatsApp: <b>Aparelhos conectados</b> &gt; <b>Conectar com número de telefone</b> e digite o código acima.
          </div>
        </div>
      ` : '';

      const statusBadge = isConnected
        ? `<div style="background: #2b8a3e; color: #fff; padding: 12px 24px; border-radius: 30px; font-weight: bold; display: inline-block;">
             ✅ WhatsApp Conectado com Sucesso!
           </div>
           <p style="color: #495057; margin-top: 16px;">O bot está ativo e divulgando promoções automaticamente.</p>`
        : (currentQr || currentPairingCode
            ? `<div style="margin-bottom: 20px;">
                 <span style="background: #f59f00; color: #fff; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: bold;">
                   Aguardando Conexão
                 </span>
               </div>
               ${pairingHtml}
               ${qrImageHtml}`
            : `<div style="color: #868e96; padding: 40px;">⏳ Inicializando WhatsApp... Aguarde alguns instantes.</div>`);

      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WhatsApp Promo Bot - Conexão</title>
  ${!isConnected ? '<meta http-equiv="refresh" content="5">' : ''}
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #f8f9fa;
      color: #212529;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      box-sizing: border-box;
    }
    .card {
      background: #ffffff;
      padding: 32px 24px;
      border-radius: 16px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.05);
      text-align: center;
      max-width: 440px;
      width: 100%;
    }
    h1 {
      font-size: 22px;
      margin-top: 0;
      margin-bottom: 8px;
      color: #12b886;
    }
    p.subtitle {
      font-size: 14px;
      color: #868e96;
      margin-bottom: 24px;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>🤖 Promo Bot WhatsApp</h1>
    <p class="subtitle">Painel de Conexão e Automação</p>
    ${statusBadge}
  </div>
</body>
</html>`;

      res.end(html);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  });

  server.listen(port, () => {
    console.log(`🌐 Painel Web do QR Code ativo na porta ${port} (Acesse pelo navegador)`);
  });

  return server;
}

module.exports = {
  iniciarServidorHttp,
  setQrCode,
  setPairingCode,
  setConnected
};
