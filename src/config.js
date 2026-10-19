const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

module.exports = {
  affiliates: {
    amazonTag: process.env.AMAZON_ASSOCIATE_TAG || '',
    mlTag: process.env.MERCADOLIVRE_AFFILIATE_TAG || '',
    shopeeSubId: process.env.SHOPEE_AFFILIATE_SUBID || ''
  },
  whatsapp: {
    channelJid: process.env.WHATSAPP_CHANNEL_JID || '',
    sessionDir: path.resolve(__dirname, '../session'),
    // Número de telefone do administrador (opcional, com DDI + DDD, ex: 5511999999999)
    adminPhone: process.env.ADMIN_PHONE_NUMBER || ''
  },
  crawler: {
    cronSchedule: process.env.CRAWLER_CRON_SCHEDULE || '0 */2 * * *',
    maxDealsPerRun: parseInt(process.env.MAX_DEALS_PER_RUN, 10) || 3,
    delaySeconds: parseInt(process.env.DELAY_BETWEEN_POSTS_SECONDS, 10) || 45
  },
  server: {
    port: parseInt(process.env.PORT, 10) || 3000
  },
  databasePath: path.resolve(__dirname, '../database.json')
};
