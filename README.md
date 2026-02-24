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

- Autenticação via JWT (JSON Web Token)
- Senhas armazenadas com hash bcrypt
- Transações isoladas por usuário
- Verificação de propriedade antes de operações
- Controle de acesso baseado em perfis
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

- [ ] Metas financeiras
- [ ] Backup automático
- [ ] App mobile
- [ ] Integração bancária

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
