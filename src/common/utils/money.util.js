// All monetary values stored as integers in the smallest currency unit (poisha)
// to avoid floating point drift. Convert only at display boundaries.

export function toMinorUnits(amount) {
  return Math.round(amount * 100);
}

export function toMajorUnits(amountMinor) {
  return Math.round(amountMinor) / 100;
}

export function roundCurrency(amount) {
  return Math.round(amount * 100) / 100;
}

export function sum(...amounts) {
  return roundCurrency(amounts.reduce((acc, a) => acc + (a || 0), 0));
}

