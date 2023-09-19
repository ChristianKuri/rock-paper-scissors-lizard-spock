export function generateSalt() {
  return Math.floor(Math.random() * 8_999_999_999) + 1_000_000_000;
}
