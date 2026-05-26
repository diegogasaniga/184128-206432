export function shortenAddress(address: string, start = 6, end = 4): string {
  if (!address) {
    return '';
  }

  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

export function formatToFixed(value: string, digits = 4): string {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return '0.0000';
  }

  return numericValue.toFixed(digits);
}