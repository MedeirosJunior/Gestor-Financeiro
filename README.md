# 💰 Gestor Financeiro

Sistema completo de gestão financeira pessoal desenvolvido com React 19 e Node.js.

## 🌐 Demo Online

**Acesse o sistema em produção**: https://gestor-financeito.onrender.com

## 🚀 Funcionalidades

- **Dashboard Interativo**: Visão geral das finanças mensais com gráficos
- **Lançamento de Entradas**: Cadastro de receitas por categoria
- **Lançamento de Despesas**: Controle de gastos organizados
- **Relatórios Mensais**: Análise detalhada com gráficos (Recharts)
- **Exportação PDF/Excel**: Relatórios exportáveis em PDF (jsPDF) e CSV/XLSX
- **Notificações em tempo real**: Feedback visual com react-toastify
- **Recuperação de senha**: Envio de e-mail via Nodemailer
- **Sistema de Usuários**: Autenticação JWT e controle de perfis
- **Painel Administrativo**: Gestão completa do sistema

## 🛠️ Tecnologias Utilizadas

### Frontend
- React 19
- Recharts (gráficos interativos)
- jsPDF + jsPDF-AutoTable (exportação PDF)
- xlsx + file-saver (exportação Excel)
- react-toastify (notificações)
- CSS3 com design responsivo e mobile

### Backend
- Node.js + Express 5
- SQLite3
- JSON Web Token (JWT) — autenticação
- bcryptjs — hash de senhas
- Nodemailer — envio de e-mails
- CORS

## 📦 Instalação

1. **Clone o repositório**:
```bash
git clone https://github.com/MedeirosJunior/Gestor-Financeito.git
cd Gestor-Financeito
```

2. **Instale as dependências do backend**:
```bash
npm install
```

3. **Instale as dependências do frontend**:
```bash
cd gestor-financeiro-frontend
npm install
cd ..
```

4. **Execute o projeto**:
```bash
npm run dev
```

O sistema estará disponível em:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## 👤 Primeiro Acesso

O sistema cria automaticamente um usuário administrador na primeira execução. Acesse a aplicação e registre-se ou utilize as credenciais de administrador configuradas no servidor.

## 📱 Funcionalidades Detalhadas

### Dashboard
- Resumo financeiro mensal
- Saldo atual (entradas - despesas)
- Últimas transações registradas
- Gráficos de receitas vs despesas (Recharts)

### Lançamentos
- **Entradas**: Salário, Freelance, Investimentos, Vendas, Outros
- **Despesas**: Alimentação, Transporte, Moradia, Saúde, Educação, Lazer, Outros
- Validação de campos obrigatórios
- Data automática (editável)

### Relatórios
- Filtro por mês/ano
- Análise por categorias com gráficos
- Percentuais de gastos
- Exportação para PDF e Excel/CSV

### Administração
- Cadastro de novos usuários
- Controle de perfis (Admin/Usuário)
- Estatísticas gerais do sistema
- Visualização de todas as transações

## 🔒 Segurança

- Autenticação via JWT (JSON Web Token) com `role` (`admin`/`user`) no payload
- Senhas armazenadas com hash bcrypt
- Todas as rotas de transações protegidas por `authenticateToken`
- Rotas `/admin/*` com middleware `requireAdmin` (somente role `admin`)
- Rate limiting no login: máximo 10 tentativas por IP a cada 15 minutos
- Cabeçalhos HTTP de segurança via `helmet` (CSP, HSTS, X-Frame-Options etc.)
- Transações isoladas por usuário com verificação de propriedade
- Proteção contra exclusão de administradores

## 📊 Estrutura do Banco de Dados

### Tabela Users
- id, name, email, password, role, created_at

### Tabela Transactions
- id, type, description, category, value, date, userId, created_at

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 👨‍💻 Autor

MedeirosJunior
- GitHub: [@MedeirosJunior](https://github.com/MedeirosJunior)
- Projeto: [Gestor-Financeito](https://github.com/MedeirosJunior/Gestor-Financeito)

## 🎯 Próximas Funcionalidades

- [ ] Integração bancária
- [ ] Dashboard de metas financeiras no frontend (backend já implementado)

## 📱 App Mobile (React Native / Expo)

O app mobile está disponível na pasta `gestor-financeiro-mobile/`.

### Funcionalidades do App
- Login com autenticação JWT
- Dashboard com saldo, entradas e despesas do mês atual
- Lançamento de receitas e despesas com categorias
- Lista de transações com busca e filtros
- Relatórios mensais com gráfico de barras e breakdown por categoria

### Como rodar o app

**Pré-requisitos:** Node.js 18+, Expo CLI, e o app [Expo Go](https://expo.dev/go) no celular.

```bash
cd gestor-financeiro-mobile
npm install --legacy-peer-deps
npx expo start
```

Escaneie o QR Code com o Expo Go (Android) ou a câmera (iOS).

### Estrutura do app

```
gestor-financeiro-mobile/
  App.js                          # Entrada da aplicação
  app.json                        # Configuração Expo
  src/
    config/api.js                 # URL da API e constantes
    context/AuthContext.js        # Autenticação JWT + authFetch
    navigation/AppNavigator.js    # Navegação (Stack + Bottom Tabs)
    screens/
      LoginScreen.js              # Tela de login
      DashboardScreen.js          # Resumo financeiro do mês
      AddTransactionScreen.js     # Lançar receita ou despesa
      TransactionsScreen.js       # Lista completa com busca
      ReportsScreen.js            # Relatórios com gráficos
```

## 🚀 Deploy

A aplicação utiliza uma arquitetura separada em três serviços:

| Serviço | Plataforma | URL |
|---|---|---|
| Frontend | Netlify | https://gestor-financeito.netlify.app |
| Backend | Render | https://gestor-financeito.onrender.com |
| Banco de Dados | Turso (libSQL) | *configurado via variáveis de ambiente* |

### Variáveis de Ambiente (Render — Backend)

Configure as seguintes variáveis no painel do Render:

| Variável | Descrição |
|---|---|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | Chave secreta para tokens JWT |
| `ADMIN_EMAIL` | E-mail do administrador padrão |
| `ADMIN_PASSWORD` | Senha do administrador padrão |
| `TURSO_DATABASE_URL` | URL do banco Turso (`libsql://seu-banco.turso.io`) |
| `TURSO_AUTH_TOKEN` | Token de autenticação do Turso |
| `FRONTEND_URL` | `https://gestor-financeito.netlify.app` |
| `SENDGRID_API_KEY` | *(opcional)* Chave da API SendGrid para e-mails |

### Variáveis de Ambiente (Netlify — Frontend)

Configure em **Site settings → Environment variables**:

| Variável | Valor |
|---|---|
| `REACT_APP_API_URL` | `https://gestor-financeito.onrender.com` |

### Deploy Automático

O projeto está configurado para deploy automático via GitHub:
1. Push para a branch `main`
2. **Render** reconstrói e reinicia o backend automaticamente
3. **Netlify** reconstrói e publica o frontend automaticamente

### Banco de Dados

- **Produção**: [Turso](https://turso.tech) — banco libSQL na nuvem, configurado via `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`
- **Desenvolvimento local**: arquivo SQLite em `./data/database.db` (criado automaticamente)
