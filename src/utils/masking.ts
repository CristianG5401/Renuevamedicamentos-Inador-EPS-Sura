/**
 * Utility functions for masking sensitive data in logs.
 * Pure functions with no external dependencies.
 */

/**
 * Masks a WhatsApp chat ID for safe logging.
 * Example: "573175180237@c.us" → "5731***0237@c.us"
 * @param chatId - The full chat ID (e.g., "573175180237@c.us")
 * @returns The masked chat ID
 */
export function maskPhone(chatId: string): string {
  const [number, suffix] = chatId.split("@");
  if (!number || number.length <= 8) return chatId;

  const visibleStart = number.slice(0, 4);
  const visibleEnd = number.slice(-4);
  const masked = `${visibleStart}***${visibleEnd}`;

  return suffix ? `${masked}@${suffix}` : masked;
}

/**
 * Masks a document number for safe logging.
 * Example: "1234567890" → "123***7890"
 * @param idNumber - The full document number
 * @returns The masked document number
 */
export function maskIdNumber(idNumber: string): string {
  if (idNumber.length <= 6) return "***";

  const visibleStart = idNumber.slice(0, 3);
  const visibleEnd = idNumber.slice(-4);
  return `${visibleStart}***${visibleEnd}`;
}
