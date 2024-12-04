export function makeRandomDigits(digits = 2n) {
  if (digits < 1n) throw new Error('digits must be positive');
  const maxValue = Math.pow(10, Number(digits)) - 1;
  const num = Math.floor(Math.random() * (maxValue + 1));
  return num.toString().padStart(Number(digits), '0');
}
