// Carts per user, in memory for the sample.
const carts = new Map([[1, [{ sku: 'BOOK-1843', name: 'Notes on the Analytical Engine', quantity: 1 }]]]);

export function getCart(userId) {
  return carts.get(userId) ?? [];
}
