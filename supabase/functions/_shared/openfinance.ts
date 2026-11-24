export const EXPENSE_CATEGORIES = [
  'Alimentação',
  'Transporte',
  'Moradia',
  'Saúde',
  'Lazer',
  'Educação',
  'Compras',
  'Contas',
  'Outros',
] as const;

export const INCOME_CATEGORIES = [
  'Salário',
  'Freelance',
  'Investimentos',
  'Presentes',
  'Outros',
] as const;

export type Direction = 'income' | 'expense';
export type AccountKind = 'BANK' | 'CREDIT';

export interface PluggyTransaction {
  id: string;
  description: string;
  currencyCode: string;
  amount: number;
  date: string;
  category?: string | null;
  type?: 'CREDIT' | 'DEBIT';
  status?: 'POSTED' | 'PENDING';
}

export interface ImportRow {
  external_id: string;
  type: Direction;
  description: string;
  amount: number;
  date: string;
  categoryName: string;
}

export type SkipReason =
  | 'pending'
  | 'foreign_currency'
  | 'invalid'
  | 'card_bill_payment'
  | 'card_payment_received';

export type MapResult = { row: ImportRow } | { skip: SkipReason };

const round2 = (n: number) => Math.round(n * 100) / 100;

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export function toBrazilDate(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const isMidnightUtc =
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0;
  const base = isMidnightUtc ? date : new Date(date.getTime() - 3 * 60 * 60 * 1000);
  return base.toISOString().slice(0, 10);
}

export function cleanDescription(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim().slice(0, 80);
  return clean.length >= 2 ? clean : 'Transação bancária';
}

const RULES_EXPENSE: [string, string][] = [
  [
    'Alimentação',
    'eating out|restaurant|grocer|supermarket|food|bakery|padaria|' +
      'mercado|supermercado|restaurante|lanchonete|ifood|rappi|pizza|' +
      'hamburg|acougue|cafeteria|sorveteria|delivery',
  ],
  [
    'Transporte',
    'transport|taxi|ride-hailing|uber|99app|fuel|gas station|combust|posto|' +
      'estaciona|parking|toll|pedagio|metro|onibus|bilhete unico|' +
      'sem parar|veloe|conectcar',
  ],
  [
    'Saúde',
    'health|pharmacy|drugstore|farmacia|drogaria|drogasil|pacheco|' +
      'hospital|clinica|medic|dental|odonto|laborat|unimed|gym|academia',
  ],
  [
    'Educação',
    'education|school|tuition|course|curso|escola|faculdade|' +
      'universidade|livraria|udemy|alura|coursera',
  ],
  [
    'Lazer',
    'entertainment|streaming|netflix|spotify|disney|hbo|prime video|' +
      'youtube|cinema|ingresso|steam|playstation|xbox|leisure|travel|' +
      'viagem|hotel|airbnb|booking',
  ],
  ['Moradia', 'aluguel|mortgage|condominio|housing|iptu|reforma'],
  [
    'Contas',
    'utilities|bills|energia|enel|cemig|sabesp|copasa|internet|' +
      'telecom|vivo|claro|telefone|seguro|insurance|imposto|tarifa|' +
      'anuidade|boleto',
  ],
  [
    'Compras',
    'shopping|retail|clothing|electronics|online payment|amazon|' +
      'mercado livre|mercadolivre|magalu|americanas|shopee|shein|' +
      'aliexpress|renner|zara|loja',
  ],
];

const RULES_INCOME: [string, string][] = [
  [
    'Salário',
    'salary|payroll|wage|salario|folha de pagamento|proventos|' + 'remuneracao',
  ],
  [
    'Investimentos',
    'investment|dividend|interest|yield|rendimento|juros|resgate|cdb|' + 'tesouro',
  ],
  ['Freelance', 'freelance|prestacao de servico|honorarios'],
  ['Presentes', 'gift|presente'],
];

function firstMatch(rules: [string, string][], text: string): string | null {
  for (const [category, words] of rules) {
    if (words.split('|').some((w) => text.includes(w))) return category;
  }
  return null;
}

export function suggestCategory(
  direction: Direction,
  pluggyCategory: string | null | undefined,
  description: string,
): string {
  const rules = direction === 'income' ? RULES_INCOME : RULES_EXPENSE;
  const fromCategory = pluggyCategory
    ? firstMatch(rules, normalize(pluggyCategory))
    : null;
  return fromCategory ?? firstMatch(rules, normalize(description)) ?? 'Outros';
}

const BILL_PAYMENT_ON_BANK =
  /(pag|pgto)\w*\.?\s*(de\s*)?(da\s*)?fatura|fatura\s*(do\s*)?cart/;
const PAYMENT_ON_CARD =
  /pagamento (recebido|efetuado)|payment received|(pag|pgto)\w*\.?\s*fatura/;

function direction(tx: PluggyTransaction, kind: AccountKind): Direction {
  if (tx.type === 'CREDIT') return 'income';
  if (tx.type === 'DEBIT') return 'expense';
  if (kind === 'CREDIT') return tx.amount >= 0 ? 'expense' : 'income';
  return tx.amount >= 0 ? 'income' : 'expense';
}

export function mapTransaction(tx: PluggyTransaction, kind: AccountKind): MapResult {
  if (tx.status === 'PENDING') return { skip: 'pending' };
  if (tx.currencyCode !== 'BRL') return { skip: 'foreign_currency' };
  const amount = round2(Math.abs(tx.amount));
  const date = toBrazilDate(tx.date);
  if (!tx.id || !date || !Number.isFinite(amount) || amount <= 0)
    return { skip: 'invalid' };

  const type = direction(tx, kind);
  const text = normalize(tx.description);

  if (kind === 'BANK' && type === 'expense' && BILL_PAYMENT_ON_BANK.test(text)) {
    return { skip: 'card_bill_payment' };
  }
  if (kind === 'CREDIT' && type === 'income' && PAYMENT_ON_CARD.test(text)) {
    return { skip: 'card_payment_received' };
  }

  return {
    row: {
      external_id: tx.id,
      type,
      description: cleanDescription(tx.description),
      amount,
      date,
      categoryName: suggestCategory(type, tx.category, tx.description),
    },
  };
}

const DAY = 24 * 60 * 60 * 1000;

export function buildRange(lastSyncedAt: string | null, now: Date) {
  const last = lastSyncedAt ? new Date(lastSyncedAt) : null;
  const start =
    last && !Number.isNaN(last.getTime())
      ? new Date(last.getTime() - 7 * DAY)
      : new Date(now.getTime() - 90 * DAY);
  return { from: start.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
}

export function describeItemProblem(
  status: string,
  executionStatus?: string | null,
): { message: string; httpStatus: number } | null {
  if (status === 'UPDATED') return null;
  if (status === 'LOGIN_ERROR') {
    const byExecution: Record<string, string> = {
      USER_AUTHORIZATION_NOT_GRANTED: 'Você não autorizou o compartilhamento dos dados.',
      USER_AUTHORIZATION_REVOKED:
        'O consentimento foi revogado no banco. Conecte novamente.',
      INVALID_CREDENTIALS: 'As credenciais informadas são inválidas.',
    };
    return {
      message:
        byExecution[executionStatus ?? ''] ??
        'Não foi possível entrar no banco. Conecte novamente.',
      httpStatus: 422,
    };
  }
  if (status === 'OUTDATED') {
    return {
      message: 'O banco está instável no momento. Tente novamente mais tarde.',
      httpStatus: 502,
    };
  }
  return {
    message:
      'A conexão ainda está sendo processada. Aguarde um instante e tente de novo.',
    httpStatus: 409,
  };
}
