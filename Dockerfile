FROM registry.access.redhat.com/ubi9/nodejs-20-minimal:latest

# Define diretório de trabalho
WORKDIR /opt/app-root/src

# Copia arquivos de dependência
COPY --chown=1001:0 package*.json ./

# Instala dependências de produção
RUN npm ci --omit=dev

# Copia o código da aplicação
COPY --chown=1001:0 . .

# Garante permissões adequadas para o usuário não-root
RUN mkdir -p session logs && chown -R 1001:0 /opt/app-root/src

# Usa usuário não-root
USER 1001

# Expõe porta do Health Check
EXPOSE 3000

# Executa o serviço principal
CMD ["node", "src/index.js"]
