// The embedding model: text in, a vector of 8 numbers out, one per meaning. Real models learn hundreds of meanings
// from billions of sentences; this one is a small dictionary, so every number can be checked by hand.
export const MEANINGS = ['money', 'time', 'delivery', 'account', 'security', 'product', 'support', 'problem'];

/** How much each word pulls towards each meaning. Words not listed carry no meaning (the, your, to…). */
const LEXICON = {
  refunds: { money: 1.0 },
  refund: { money: 1.0 },
  money: { money: 1.0 },
  back: { money: 0.6, time: 0.1 },
  card: { money: 0.6 },
  charged: { money: 0.9, problem: 0.4 },
  payment: { money: 0.9 },
  invoices: { money: 0.7, account: 0.3 },
  purchase: { money: 0.6, product: 0.3 },
  dollars: { money: 0.8 },
  free: { money: 0.5 },
  return: { money: 0.4, product: 0.3 },
  when: { time: 0.8 },
  days: { time: 0.9 },
  hours: { time: 0.9 },
  within: { time: 0.5 },
  year: { time: 0.6 },
  monday: { time: 0.7 },
  friday: { time: 0.7 },
  get: { delivery: 0.2, money: 0.1 },
  ship: { delivery: 1.0 },
  orders: { delivery: 0.6, product: 0.3 },
  parcel: { delivery: 1.0 },
  shipping: { delivery: 1.0 },
  track: { delivery: 0.8 },
  delivery: { delivery: 1.0 },
  warehouse: { delivery: 0.7 },
  account: { account: 1.0 },
  login: { account: 0.8, security: 0.3 },
  settings: { account: 0.7 },
  delete: { account: 0.6 },
  emailed: { account: 0.3 },
  email: { account: 0.3, delivery: 0.2 },
  password: { security: 1.0, account: 0.5 },
  verification: { security: 1.0 },
  protect: { security: 0.9 },
  reset: { security: 0.5, account: 0.3 },
  product: { product: 1.0 },
  warranty: { product: 0.9, time: 0.3 },
  damaged: { product: 0.6, problem: 0.9 },
  swapped: { product: 0.7 },
  new: { product: 0.4 },
  chat: { support: 1.0 },
  support: { support: 1.0 },
  sizes: { product: 0.6 },
  colors: { product: 0.5 },
  twice: { problem: 0.8 },
};

/** The words of a text, lowercase, without punctuation. */
export function tokens(text) {
  return text.toLowerCase().match(/[a-z]+/g) ?? [];
}

/** The raw vector: the sum of the meanings of each word. */
export function rawVector(text) {
  const vector = MEANINGS.map(() => 0);
  for (const word of tokens(text)) {
    for (const [meaning, weight] of Object.entries(LEXICON[word] ?? {})) vector[MEANINGS.indexOf(meaning)] += weight;
  }
  return vector;
}

export const length = (vector) => Math.sqrt(vector.reduce((sum, x) => sum + x * x, 0));

/** The embedding: the raw vector divided by its length, so every embedding has length 1 and only its direction counts. */
export function embed(text) {
  const raw = rawVector(text);
  const size = length(raw);
  return raw.map((x) => (size === 0 ? 0 : x / size));
}
