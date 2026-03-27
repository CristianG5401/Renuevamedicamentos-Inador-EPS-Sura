/**
 * Módulo centralizado de configuración.
 * Valida las variables de entorno requeridas al iniciar (fail-fast),
 * permite sobreescribir valores desde argumentos CLI,
 * y provee utilidades de masking para datos sensibles en los logs.
 *
 * Bun carga los archivos .env automáticamente — no se necesita dotenv.
 */

/** Valores sobreescribibles desde la CLI (datos del usuario). */
export interface CliOverrides {
  idNumber?: string;
  idType?: string;
  birthdate?: string;
  nothingToRenewAlertMessage?: string;
  successAlertMessage?: string;
  techAlertChatId?: string;
  userToAlertChatId?: string;
}

/** Configuración validada con todos los campos requeridos como strings. */
export interface ValidatedConfig {
  birthdate: string;
  epsChatId: string;
  idNumber: string;
  idType: string;
  nothingToRenewAlertMessage: string;
  successAlertMessage: string;
  techAlertChatId: string;
  userToAlertChatId: string;
}

/**
 * Resuelve la configuración final fusionando CLI args con variables de entorno.
 * Prioridad: CLI args (más alta) → process.env → error si falta.
 * @param overrides - Valores opcionales desde la CLI que sobreescriben .env
 * @returns Configuración validada con todos los campos presentes
 */
export function resolveConfig(overrides?: CliOverrides): ValidatedConfig {
  const resolved = {
    birthdate: overrides?.birthdate ?? process.env.BIRTHDATE,
    idNumber: overrides?.idNumber ?? process.env.ID_NUMBER,
    idType: overrides?.idType ?? process.env.ID_TYPE,
    nothingToRenewAlertMessage:
      overrides?.nothingToRenewAlertMessage ??
      process.env.NOTHING_TO_RENEW_ALERT_MESSAGE,
    successAlertMessage:
      overrides?.successAlertMessage ?? process.env.SUCCESS_ALERT_MESSAGE,
    techAlertChatId:
      overrides?.techAlertChatId ?? process.env.TECH_ALERT_CHAT_ID,
    userToAlertChatId:
      overrides?.userToAlertChatId ?? process.env.USER_TO_ALERT_CHAT_ID,
    epsChatId: process.env.EPS_CHAT_ID,
  };

  const missingVars = Object.entries(resolved)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    throw new Error(
      `Faltan variables de configuración requeridas: ${missingVars.join(", ")}.\n` +
        "Crea un archivo .env basado en .env.example o pasa los valores como argumentos CLI.",
    );
  }

  return resolved as ValidatedConfig;
}

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
