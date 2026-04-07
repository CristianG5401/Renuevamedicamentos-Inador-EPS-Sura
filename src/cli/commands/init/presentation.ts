/**
 * Capa de salida visual del comando `init`.
 *
 * Este archivo concentra el banner de bienvenida, las ayudas inline y la
 * vista previa enmascarada de una configuración existente. Su responsabilidad
 * es renderizar información en consola; no decide el flujo del comando ni
 * maneja la captura de entradas del usuario.
 */

import consola from "consola";
import type { ValidatedConfig } from "../../../config/types";
import { maskIdNumber, maskPhone } from "../../../utils/masking";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/**
 * Muestra al usuario una configuración existente, enmascarando los campos sensibles.
 * Se llama antes de preguntar si se debe sobrescribir para que el usuario vea qué hay.
 *
 * Acepta una configuración parcial porque el `config.json` global puede
 * no incluir todos los campos de forma legítima (el resto puede venir de env vars
 * o argumentos CLI; ver `resolve.ts`).
 * Solo se imprimen los campos presentes.
 */
export function showExistingConfig(config: Partial<ValidatedConfig>): void {
  if (isNonEmptyString(config.idType))
    consola.info(`Tipo de documento: ${config.idType}`);
  if (isNonEmptyString(config.idNumber))
    consola.info(`Número de documento: ${maskIdNumber(config.idNumber)}`);
  if (isNonEmptyString(config.birthdate))
    consola.info(`Fecha de nacimiento: ${config.birthdate}`);
  if (isNonEmptyString(config.epsChatId))
    consola.info(`Chat ID de la EPS: ${maskPhone(config.epsChatId)}`);
  if (isNonEmptyString(config.userToAlertChatId))
    consola.info(
      `Chat ID para alertas de resultado: ${maskPhone(config.userToAlertChatId)}`,
    );
  if (isNonEmptyString(config.successAlertMessage))
    consola.info(`Mensaje de éxito: ${config.successAlertMessage}`);
  if (isNonEmptyString(config.nothingToRenewAlertMessage))
    consola.info(
      `Mensaje cuando no hay nada por renovar: ${config.nothingToRenewAlertMessage}`,
    );
  if (isNonEmptyString(config.techAlertChatId))
    consola.info(
      `Chat ID para alertas técnicas: ${maskPhone(config.techAlertChatId)}`,
    );
}

/**
 * Texto de ayuda inline para cada campo, indexado por el nombre del campo
 * en `ValidatedConfig`. Los campos que no aparecen aquí se consideran
 * autoexplicativos y no muestran ayuda.
 */
const FIELD_HINTS: Partial<Record<keyof ValidatedConfig, string>> = {
  birthdate: "Formato esperado: DD/MM/AAAA",
  epsChatId:
    "Es el identificador del chat de tu EPS en WhatsApp. Para encontrarlo, abre WhatsApp Web, entra al chat de la EPS y mira el final de la URL (ej: 573001234567@c.us).",
  userToAlertChatId:
    "Es el chat en WhatsApp donde recibirás las alertas de éxito o 'nada por renovar'. Se obtiene igual que el Chat ID de la EPS, desde WhatsApp Web.",
  successAlertMessage:
    "Este mensaje se envía cuando el proceso termina exitosamente.",
  nothingToRenewAlertMessage:
    "Este mensaje se envía cuando no hay medicamentos por renovar.",
  techAlertChatId:
    "Es el chat en WhatsApp donde recibirás los errores técnicos del bot. Se obtiene igual que el Chat ID de la EPS, desde WhatsApp Web.",
};

/**
 * Imprime la ayuda inline de un campo de configuración, si existe una registrada.
 * No hace nada para campos autoexplicativos (por ejemplo, `idType`, `idNumber`).
 */
export function showFieldHint(field: keyof ValidatedConfig): void {
  const hint = FIELD_HINTS[field];

  if (!hint) return;

  consola.info(hint);
}

/**
 * Imprime el banner de bienvenida que se muestra al inicio de `init`.
 * Explica qué hace el comando y dónde vivirá el archivo de configuración.
 *
 * @param configPath - Ruta absoluta donde se escribirá el `config.json` global.
 */
export function showWelcomeBanner(configPath: string): void {
  consola.box(
    "renuevamedicamentos-inador\nBot de renovación de medicamentos en SURA",
  );
  consola.info(
    "Este comando crea (o actualiza) tu archivo de configuración global.",
  );
  consola.info(`Ubicación: ${configPath}`);
  consola.info(
    "A continuación te pediremos tus datos personales y los chats de WhatsApp donde recibirás las alertas.",
  );
}
