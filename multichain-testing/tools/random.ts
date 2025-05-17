/**
 * @param randomN pseudorandom number between 0 and 1, e.g. Math.random()
 * @param digits number of digits to generate
 * @returns a string of digits
 */
export function makeRandomDigits(randomN: number, digits = 2n) {
  if (digits < 1n) throw new Error('digits must be positive');
  const maxValue = Math.pow(10, Number(digits)) - 1;
  const num = Math.floor(randomN * (maxValue + 1));
  return num.toString().padStart(Number(digits), '0');
}
