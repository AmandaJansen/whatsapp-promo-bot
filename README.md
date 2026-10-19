# 🤖 WhatsApp Promo Bot (100% Gratuito)

Bot automatizado para divulgação de promoções em **Canais e Grupos do WhatsApp** com conversão de links de afiliado (**Amazon**, **Mercado Livre** e **Shopee**).

Pode ser executado **no computador**, **no celular (Android via Termux)** ou **hospedado 100% grátis na nuvem (Render / Koyeb / Railway)** para rodar 24h por dia sem gastar sua bateria ou precisar do PC ligado.

---

## ⚡ Funcionalidades

1. **📱 Controle Remoto via WhatsApp (Direto do Celular):**
   - Com o bot rodando na nuvem ou no PC, você só precisa **compartilhar ou colar o link de um produto no WhatsApp do bot**.
   - O bot detecta automaticamente o link, converte para seu link de afiliado, baixa a foto, formata o texto e posta no seu canal!
   - Você recebe uma confirmação imediata no chat privado.

2. **🤖 Modo Rastreador Automático (Piloto Automático 24/7):**
   - Monitora automaticamente as páginas de ofertas da Amazon e Mercado Livre.
   - Filtra ofertas para **nunca postar produtos duplicados** (banco local `database.json`).
   - Respeita intervalos de segurança (delays configuráveis) para evitar bloqueios.
   - Executa via agendador Cron configurável (ex: a cada 1 hora ou 2 horas).

3. **💻 Modo Linha de Comando (CLI - Manual):**
   - Para quem prefere disparar pelo terminal do PC ou Termux com `npm run post`.

4. **100% Gratuito:**
   - Não depende de mensalidades ou APIs pagas de terceiros.
   - Conexão direta via Web Socket do WhatsApp ([Baileys](https://github.com/WhiskeySockets/Baileys)).

---

## ☁️ Como Hospedar 100% Grátis na Nuvem (Render / Koyeb)

Ao hospedar na nuvem, o bot fica ativo 24h por dia e você controla tudo pelo seu WhatsApp no celular.

### Opção A: Render.com (Recomendado - 100% Gratuito)

1. Crie uma conta gratuita em [render.com](https://render.com).
2. Suba este projeto para um repositório privado ou público no seu **GitHub**.
3. No painel do Render, clique em **New + > Web Service**.
4. Conecte o seu repositório do GitHub.
5. Em **Environment**, selecione **Node**.
6. Preencha as configurações:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free`
7. Na seção **Environment Variables**, adicione as variáveis do seu `.env`:
   - `AMAZON_ASSOCIATE_TAG`
   - `MERCADOLIVRE_AFFILIATE_TAG`
   - `SHOPEE_AFFILIATE_SUBID`
   - `WHATSAPP_CHANNEL_JID`
   - `ADMIN_PHONE_NUMBER` (Seu número com DDI e DDD, ex: `5511999999999`)
8. Clique em **Deploy Web Service**.
9. Na aba **Logs** do Render, você verá o **QR Code** para escanear com seu WhatsApp uma única vez. Pronto!

---

## 📱 Como Rodar no Celular Android (Termux)

Se você não quiser usar nuvem e preferir rodar no próprio Android:

1. Instale o **Termux** pelo [F-Droid](https://f-droid.org/packages/com.termux/).
2. Abra o Termux e rode:
   ```bash
   pkg update && pkg upgrade -y
   pkg install nodejs-lts git -y
   ```
3. Clone ou copie o projeto:
   ```bash
   git clone <SEU_REPOSITORIO> promo-bot
   cd promo-bot
   npm install
   cp .env.example .env
   ```
4. Edite o `.env` com `nano .env` e inicie o bot com:
   ```bash
   npm start
   ```

---

## 🛠️ Configuração do Arquivo `.env`

```env
# ==========================================
# SUAS TAGS DE AFILIADOS
# ==========================================
AMAZON_ASSOCIATE_TAG=seutag-20
MERCADOLIVRE_AFFILIATE_TAG=
SHOPEE_AFFILIATE_SUBID=meucanal

# ==========================================
# WHATSAPP
# ==========================================
WHATSAPP_CHANNEL_JID=120363XXXXXXXXXXXX@newsletter

# Seu número para controle remoto pelo WhatsApp:
ADMIN_PHONE_NUMBER=5511999999999

# ==========================================
# AGENDAMENTO DO RASTREADOR
# ==========================================
CRAWLER_CRON_SCHEDULE=0 */2 * * *
MAX_DEALS_PER_RUN=3
DELAY_BETWEEN_POSTS_SECONDS=45
PORT=3000
```

---

## 💡 Como Usar no Dia a Dia

### 1. Pelo WhatsApp (Mais prático no celular)
Envie qualquer link de produto da Amazon, Mercado Livre ou Shopee para o número do bot (ou no chat privado com você mesmo):
```text
https://www.amazon.com.br/dp/B0CX23V2ZH
```
Ou com cupom:
```text
https://produto.mercadolivre.com.br/MLB-123456 cupom: DESCONTO10
```
O bot responde confirmando e publica imediatamente no seu canal com a imagem, preço formatado e seu link de afiliado!

### 2. Pelo Terminal / Computador (Opcional)
```bash
npm run post -- "https://www.amazon.com.br/dp/B0CX23V2ZH"
```

---

## 📂 Estrutura do Projeto

```text
whatsapp-promo-bot/
├── .env.example           # Modelo de variáveis de ambiente
├── .gitignore             # Proteção de credenciais e sessão
├── database.json          # Histórico anti-duplicidade de ofertas
├── Dockerfile             # Imagem segura Red Hat UBI Node
├── render.yaml            # Configuração de deploy automático no Render
├── package.json           # Dependências e scripts npm
├── src/
│   ├── config.js          # Carregamento e validação de configurações
│   ├── affiliate.js       # Regras de conversão de links de afiliado
│   ├── scraper.js         # Extração de dados (título, preço, imagem)
│   ├── templates.js       # Formatação visual das mensagens
│   ├── database.js        # Gerenciador do banco local JSON
│   ├── crawler.js         # Rastreador de ofertas da Amazon e ML
│   ├── whatsapp.js        # Conexão Baileys + Escuta de mensagens remotas
│   ├── server.js          # Servidor HTTP para Health Check na nuvem
│   ├── cli.js             # Conversor manual via CLI
│   ├── crawler-runner.js  # Teste único do rastreador
│   └── index.js           # Serviço contínuo principal
└── README.md
```
