/**
 * Módulo centralizado de configuración.
 * Valida las variables de entorno requeridas al iniciar (fail-fast)
 * y provee utilidades de masking para datos sensibles en los logs.
 *
 * Bun carga los archivos .env automáticamente — no se necesita dotenv.
 */

// Objeto constante con todas las variables de entorno requeridas.
// Para agregar una nueva variable, solo agrega una línea más aquí.
const REQUIRED_ENV = {
  BIRTHDATE: process.env.BIRTHDATE,
  EPS_CHAT_ID: process.env.EPS_CHAT_ID,
  ID_NUMBER: process.env.ID_NUMBER,
  ID_TYPE: process.env.ID_TYPE,
  NOTHING_TO_RENEW_ALERT_MESSAGE: process.env.NOTHING_TO_RENEW_ALERT_MESSAGE,
  SUCCESS_ALERT_MESSAGE: process.env.SUCCESS_ALERT_MESSAGE,
  TECH_ALERT_CHAT_ID: process.env.TECH_ALERT_CHAT_ID,
  USER_TO_ALERT_CHAT_ID: process.env.USER_TO_ALERT_CHAT_ID,
};

/**
 * Valida que todas las variables de entorno requeridas estén presentes.
 * Filtra las keys del objeto para detectar las que faltan.
 * Lanza un error inmediatamente al importar si alguna falta.
 * @returns El objeto con los valores validados como strings (sin undefined)
 */
function validateEnv(): Record<keyof typeof REQUIRED_ENV, string> {
  const missingVars = Object.entries(REQUIRED_ENV)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    throw new Error(
      `Faltan variables de entorno requeridas: ${missingVars.join(", ")}.\n` +
        "Crea un archivo .env basado en .env.example con los valores requeridos.",
    );
  }

  return REQUIRED_ENV as Record<keyof typeof REQUIRED_ENV, string>;
}

export const ENV = validateEnv();

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
