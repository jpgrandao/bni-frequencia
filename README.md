# Sistema BNI - Controle de Frequência de Assembleias

Sistema Web simples e completo para registro de presença de **Membros**, **Visitantes (outros grupos BNI)** e **Convidados**, com **Painel Administrativo**, importação de lista de membros via Excel e exportação de cada assembleia em arquivo Excel (`.xlsx`) com múltiplas abas.

---

## 🚀 Funcionalidades

1. **Área do Administrador (`/admin`)**
   - Login protegido por senha (senha padrão: `admin123`).
   - **Importação de Membros via Excel (`.xlsx`, `.xls`, `.csv`)** com modelo de planilha disponível para download.
   - Cadastro e gerenciamento de membros (Nome, Senha, Empresa, Telefone).
   - **Gestão de Assembleias / Reuniões**:
     - Criação de reunião com **Local**, **Número da Reunião**, **Data** e **Status** (`Aberta` / `Fechada`).
     - Botão rápido para **Abrir** e **Fechar** a assembleia.
     - Visualização em tempo real dos membros presentes e visitantes/convidados.
   - **Download de Relatório Excel (`.xlsx`) por Assembleia** contendo 3 páginas (abas):
     - **Aba 1 - `Dados Geral`**: Local, Data, Número da Reunião, Status e totais.
     - **Aba 2 - `Membros`**: Nome, Hora de Entrada, Status (Presente/Ausente) e Empresa.
     - **Aba 3 - `Visitantes e Convidados`**: Nome, Empresa, Contato, Grupo BNI e Hora de Entrada.

2. **Tela de Presença do Membro (`/presenca-membro`)**
   - O membro pesquisa/escolhe o seu nome na lista e confirma a presença digitando sua senha.
   - Registra automaticamente a hora exata de entrada na assembleia aberta.

3. **Tela de Presença do Visitante ou Convidado (`/presenca-visitante`)**
   - Formulário com **Nome**, **Empresa** e **Telefone**.
   - Opção para marcar se é **Visitante** (membro de outro grupo BNI).
   - Ao marcar **Visitante**, exibe automaticamente o campo para informar **qual outro grupo BNI faz parte**.

---

## 💻 Como rodar localmente

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar servidor de desenvolvimento
npm run dev
```

Acesse no navegador: **http://localhost:3000**

---

## 🐳 Como rodar com Docker (Deploy)

O projeto já possui `Dockerfile` e `docker-compose.yml` configurados com persistência do banco de dados SQLite na pasta `./data`.

```bash
docker compose up -d --build
```
