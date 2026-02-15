import { Config } from '@/constants/config';

export function formatCurrency(amount: number): string {
  return `${Config.currency.symbol}${amount.toFixed(2)}`;
}

export function formatCurrencyWhole(amount: number): string {
  return `${Config.currency.symbol}${Math.round(amount)}`;
}
