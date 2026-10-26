# ==========================================
# Estágio 1: Build da Aplicação React / Vite
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copia os manifestos de dependências
COPY package*.json ./

# Instalação limpa com legacy-peer-deps para máxima compatibilidade
RUN npm install --legacy-peer-deps

# Copia todo o código fonte
COPY . .

# Executa o build de produção do Vite (PWA)
RUN npm run build

# ==========================================
# Estágio 2: Servidor Nginx de Produção (SPA)
# ==========================================
FROM nginx:alpine

# Remove a configuração padrão do Nginx
RUN rm -rf /etc/nginx/conf.d/default.conf

# Copia a configuração otimizada para SPA com suporte a try_files
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia os arquivos estáticos gerados no build
COPY --from=builder /app/dist /usr/share/nginx/html

# Porta 80 para Easypanel / Docker / VPS
EXPOSE 80

# Inicia o Nginx em primeiro plano
CMD ["nginx", "-g", "daemon off;"]
