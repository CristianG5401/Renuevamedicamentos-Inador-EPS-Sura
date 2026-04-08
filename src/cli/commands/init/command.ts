/**
 * Coordinador del comando interactivo `init`.
 *
 * Este archivo define el flujo principal: muestra el contexto inicial,
 * solicita los datos al usuario, decide cuándo enseñar ayudas inline
 * y delega la persistencia de la configuración final. No contiene helpers
 * reutilizables de prompts ni de renderizado; esos viven en sus módulos vecinos.
 */

import { defineCommand } from "citty";
import consola from "consola";

import {
  loadGlobalConfig,
  writeGlobalConfig,
} from "../../../infrastructure/config/global-store";
import { getConfigFilePath } from "../../../infrastructure/config/paths";
import type { ValidatedConfig } from "../../../application/config/types";
import { ID_TYPES_ARRAY } from "../../../domain/constants";
import {
  showExistingConfig,
  showFieldHint,
  showWelcomeBanner,
} from "./presentation";
import { promptText } from "./prompts";

export const initCommand = defineCommand({
  meta: {
    name: "init",
    description:
      "Crea o actualiza el archivo de configuración global (~/.config/renuevamedicamentos-inador/config.json)",
  },
  run: async () => {
    const configPath = getConfigFilePath();
    showWelcomeBanner(configPath);

    const existingConfig = await loadGlobalConfig();

    if (existingConfig) {
      consola.info("Ya existe una configuración guardada:");
      showExistingConfig(existingConfig);

      const shouldOverwrite = await consola.prompt(
        `¿Deseas sobreescribir el archivo en ${configPath}?`,
        { type: "confirm", initial: false },
      );
      if (typeof shouldOverwrite === "symbol" || !shouldOverwrite) {
        consola.info("Operación cancelada.");
        return;
      }
    }

    const idType = await consola.prompt("Tipo de documento:", {
      type: "select",
      options: ID_TYPES_ARRAY,
    });
    if (typeof idType === "symbol") return;

    const idNumber = await promptText("Número de documento:", "1234567890");
    if (!idNumber) return;

    showFieldHint("birthdate");
    const birthdate = await promptText("Fecha de nacimiento:", "DD/MM/AAAA");
    if (!birthdate) return;

    showFieldHint("epsChatId");
    const epsChatId = await promptText(
      "Chat ID de la EPS en WhatsApp:",
      "57XXXXXXXXXX@c.us",
    );
    if (!epsChatId) return;

    showFieldHint("userToAlertChatId");
    const userToAlertChatId = await promptText(
      "Chat ID donde enviar alertas de resultado:",
      "57XXXXXXXXXX@c.us",
    );
    if (!userToAlertChatId) return;

    showFieldHint("successAlertMessage");
    const successAlertMessage = await promptText(
      "Mensaje cuando el proceso se completa exitosamente:",
    );
    if (!successAlertMessage) return;

    showFieldHint("nothingToRenewAlertMessage");
    const nothingToRenewAlertMessage = await promptText(
      "Mensaje cuando no hay medicamentos por renovar:",
    );
    if (!nothingToRenewAlertMessage) return;

    showFieldHint("techAlertChatId");
    const techAlertChatId = await promptText(
      "Chat ID donde enviar alertas/errores técnicos:",
      "57XXXXXXXXXX@c.us",
    );
    if (!techAlertChatId) return;

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
    consola.success(
      `Configuración guardada en ${writtenPath}\n` +
        "Siguiente paso: usa el comando `renew` para iniciar la renovación.",
    );
  },
});
