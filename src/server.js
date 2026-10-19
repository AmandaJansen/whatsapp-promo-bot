const http = require('http');
const config = require('./config');

/**
 * Inicia um servidor HTTP leve para Health Check e manter a aplicação ativa em plataformas de nuvem
 * @param {number} port
 */
function iniciarServidorHttp(port = config.server.port) {
  const server = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'online',
        uptime: process.uptime(),
        service: 'WhatsApp Promo Bot',
        timestamp: new Date().toISOString()
      }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  });

  server.listen(port, () => {
    console.log(`🌐 Servidor de Health Check ativo na porta ${port}`);
  });

  return server;
}

module.exports = {
  iniciarServidorHttp
};
