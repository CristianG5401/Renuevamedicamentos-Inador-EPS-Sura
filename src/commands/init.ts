import { defineCommand } from "citty";
import consola from "consola";

import { ID_TYPES_ARRAY } from "../domain/constants";
import { loadGlobalConfig, writeGlobalConfig } from "../config/global-store";
import { getConfigFilePath } from "../config/paths";
import type { ValidatedConfig } from "../config/types";

/**
 * Solicita un valor de texto al usuario, retornando undefined si cancela (Ctrl+C).
 * Centraliza el patrón de chequeo de cancelación para evitar repetición.
 */
async function promptText(
  message: string,
  placeholder?: string,
): Promise<string | undefined> {
  const result = await consola.prompt(message, {
    type: "text",
    placeholder,
  });

  if (typeof result === "symbol") return undefined;

  return result;
}

export const initCommand = defineCommand({
  meta: {
    name: "init",
    description:
      "Crea o actualiza el archivo de configuración global (~/.config/renuevamedicamentos-inador/config.json)",
  },
  run: async () => {
    const configPath = getConfigFilePath();
    const existingConfig = await loadGlobalConfig();

    if (existingConfig) {
      const shouldOverwrite = await consola.prompt(
        `Ya existe un archivo de configuración en ${configPath}. ¿Deseas sobreescribirlo?`,
        { type: "confirm", initial: false },
      );
      if (typeof shouldOverwrite === "symbol" || !shouldOverwrite) {
        consola.info("Operación cancelada.");
        return;
      }
    }

    // --- Prompts ---

    const idType = await consola.prompt("Tipo de documento:", {
      type: "select",
      options: ID_TYPES_ARRAY,
    });
    if (typeof idType === "symbol") return;

    const idNumber = await promptText("Número de documento:", "1234567890");
    if (!idNumber) return;

    const birthdate = await promptText("Fecha de nacimiento:", "DD/MM/AAAA");
    if (!birthdate) return;

    const epsChatId = await promptText(
      "Chat ID de la EPS en WhatsApp:",
      "57XXXXXXXXXX@c.us",
    );
    if (!epsChatId) return;

    const userToAlertChatId = await promptText(
      "Chat ID donde enviar alertas de resultado:",
      "57XXXXXXXXXX@c.us",
    );
    if (!userToAlertChatId) return;

    const successAlertMessage = await promptText(
      "Mensaje cuando el proceso se completa exitosamente:",
    );
    if (!successAlertMessage) return;

    const nothingToRenewAlertMessage = await promptText(
      "Mensaje cuando no hay medicamentos por renovar:",
    );
    if (!nothingToRenewAlertMessage) return;

    const techAlertChatId = await promptText(
      "Chat ID donde enviar alertas/errores técnicos:",
      "57XXXXXXXXXX@c.us",
    );
    if (!techAlertChatId) return;

    // --- Write ---

    const config: ValidatedConfig = {
      idType,
      idNumber,
      birthdate,
      epsChatId,
      userToAlertChatId,
      successAlertMessage,
      nothingToRenewAlertMessage,
      techAlertChatId,
    };

    const writtenPath = await writeGlobalConfig(config);
    consola.success(`Configuración guardada en ${writtenPath}`);
  },
});
