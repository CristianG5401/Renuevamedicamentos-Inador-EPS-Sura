/**
 * Funciones utilitarias para enmascarar datos sensibles en logs.
 * Funciones puras sin dependencias externas.
 */

/**
 * Enmascara un chat ID de WhatsApp para logueo seguro.
 * Ejemplo: "573175180237@c.us" → "5731***0237@c.us"
 * @param chatId - El chat ID completo (ej: "573175180237@c.us")
 * @returns El chat ID enmascarado
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
 * Enmascara un número de documento para logueo seguro.
 * Ejemplo: "1234567890" → "123***7890"
 * @param idNumber - El número de documento completo
 * @returns El número de documento enmascarado
 */
export function maskIdNumber(idNumber: string): string {
  if (idNumber.length <= 6) return "***";

  const visibleStart = idNumber.slice(0, 3);
  const visibleEnd = idNumber.slice(-4);
  return `${visibleStart}***${visibleEnd}`;
}
