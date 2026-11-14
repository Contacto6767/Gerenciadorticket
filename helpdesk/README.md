# Sistema de Gestão de Chamados — HelpDesk

## Descrição
Sistema web de gestão de chamados (help desk) com frontend React + Vite e backend Node.js + Express + SQLite.

## Pré-requisitos
- Node.js 18+ 
- npm 9+

## Instalação

```bash
# Clone o projeto ou extraia os arquivos
# Acesse a pasta do projeto
cd helpdesk

# Instale as dependências de ambos os módulos
npm run install:all
```

## Executando o projeto

Abra dois terminais:

**Terminal 1 — Backend:**
```bash
npm run dev:server
```
O servidor iniciará em: http://localhost:3001

**Terminal 2 — Frontend:**
```bash
npm run dev:client
```
O frontend iniciará em: http://localhost:5173

Acesse http://localhost:5173 no navegador.

## Credenciais padrão do Administrador

| Campo | Valor |
|-------|-------|
| Login | admin |
| Senha | admin123 |

> ⚠️ **Importante:** Altere a senha do administrador após o primeiro acesso.

## Papéis e Permissões

| Funcionalidade | ADMIN | TÉCNICO | USUÁRIO |
|----------------|-------|---------|---------|
| Criar ticket | ✅ | ✅ | ✅ |
| Ver todos os tickets | ✅ | ❌ | ❌ |
| Ver tickets próprios | ✅ | ✅ (atribuídos) | ✅ |
| Ver novos tickets (fila) | ✅ | ✅ | ❌ |
| Assumir ticket | ❌ | ✅ | ❌ |
| Comentar em ticket | ✅ | ✅ (atribuídos) | ✅ (próprios) |
| Adicionar anexo | ✅ | ✅ (atribuídos) | ✅ (próprios, não fechados) |
| Alterar status | ✅ (qualquer) | ✅ (limitado, atribuídos) | ❌ |
| Fechar ticket | ✅ | ✅ (com confirmação) | ❌ |
| Reabrir ticket (CLOSED) | ✅ | ❌ | ❌ |
| Excluir ticket (soft delete) | ✅ | ❌ | ❌ |
| Reatribuir técnico | ✅ | ❌ | ❌ |
| Gestão de usuários | ✅ | ❌ | ❌ |
| Resetar senha | ✅ | ❌ | ❌ |
| Relatório de acompanhamento | ✅ | ❌ | ❌ |

## Fluxo de Status dos Tickets

```
ABERTO → EM ATENDIMENTO ⇄ AGUARDANDO USUÁRIO → RESOLVIDO → FECHADO
```

- **Aberto (OPEN):** Ticket criado, sem técnico atribuído
- **Em Atendimento (IN_PROGRESS):** Técnico assumiu o ticket
- **Aguardando Usuário (WAITING_USER):** Aguardando resposta do usuário
- **Resolvido (RESOLVED):** Técnico marcou como resolvido
- **Fechado (CLOSED):** Confirmação final — somente Admin pode reabrir

## Funcionalidades de Notificação

- Polling automático a cada 15 segundos
- Som de notificação sintetizado (marimba suave)
- Toggle de som (ativar/desativar) no menu superior
- Toast com mensagem e contador no sino de notificações

## Estrutura do Projeto

```
helpdesk/
├── package.json          # Scripts raiz do monorepo
├── README.md
├── client/               # Frontend React + Vite
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── index.css
│       ├── utils/
│       │   ├── api.js
│       │   └── notificationSound.js
│       ├── contexts/
│       │   └── AuthContext.jsx
│       ├── components/
│       │   ├── Layout.jsx
│       │   ├── Sidebar.jsx
│       │   ├── TopBar.jsx
│       │   ├── Toast.jsx
│       │   └── ProtectedRoute.jsx
│       └── pages/
│           ├── LoginPage.jsx
│           ├── NewTicketPage.jsx
│           ├── TicketListPage.jsx
│           ├── OpenTicketsPage.jsx
│           ├── TicketDetailPage.jsx
│           ├── UserManagementPage.jsx
│           └── ReportPage.jsx
└── server/               # Backend Node.js + Express
    ├── package.json
    ├── index.js
    ├── db/
    │   └── database.js
    ├── middleware/
    │   └── auth.js
    ├── routes/
    │   ├── auth.js
    │   ├── tickets.js
    │   ├── comments.js
    │   ├── attachments.js
    │   ├── users.js
    │   ├── notifications.js
    │   └── report.js
    └── uploads/
        └── .gitkeep
```

## Variáveis de Ambiente (Opcionais)
Nenhuma variável de ambiente é necessária para execução local. O banco de dados SQLite é criado automaticamente em `server/helpdesk.db`.

## Tecnologias Utilizadas

**Frontend:**
- React 18
- Vite 5
- React Router 6
- Axios

**Backend:**
- Node.js
- Express 4
- better-sqlite3
- bcrypt
- multer
- uuid
