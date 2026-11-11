import { total } from './price.js';
export function receipt(items) {
  return { currency: 'NOK', amount: total(items) };
}
throw new Error('Static analysis only: this example must never be executed.');
