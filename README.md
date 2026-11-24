# FinTrack

Aplicativo mobile de finanças pessoais: registre receitas e despesas, **importe lançamentos direto do seu banco via Open Finance** e acompanhe para onde o dinheiro está indo.

## Funcionalidades

- Cadastro, login e sessão persistente (Supabase Auth)
- Lançamentos de receitas e despesas: criar, editar e excluir
- **Open Finance:** conecte seus bancos e importe extratos e faturas (somente leitura)
- Painel mensal com saldo, receitas, despesas e gráfico por categoria
- Lista agrupada por dia, com busca e filtro por tipo
- Exportação dos lançamentos em CSV
- Dados isolados por usuário com Row Level Security

## Tecnologias

React Native · Expo · Expo Router · TypeScript · Supabase (Auth, Postgres, RLS, Edge Functions) · Pluggy (agregador Open Finance) · TanStack Query · React Hook Form · Zod · react-native-svg · Jest

## Como executar

1. Instale as dependências: `npm install`
2. Crie um projeto no Supabase e execute `supabase/schema.sql` e `supabase/open-finance.sql`.
3. Copie `.env.example` para `.env` e preencha as chaves.
4. Inicie o app: `npx expo start`
