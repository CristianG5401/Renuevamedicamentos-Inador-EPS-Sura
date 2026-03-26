import { defineCommand } from "citty";

// Constantes
import { ID_TYPES_ARRAY } from "../domain/constants";
// Configuración
import { resolveConfig } from "../config";
// Adapter
import { WhatsAppWebJsAdapter } from "../adapters/whatsappWebJs";
// Bot
import { startRenewal } from "../orchestrator";

export const renewCommand = defineCommand({
  meta: {
    name: "renew",
    description:
      "Renueva los medicamentos de una persona una vez por mes en la EPS SURA",
  },
  args: {
    idType: {
      type: "enum",
      options: ID_TYPES_ARRAY,
      description: "Tipo de documento de la persona",
    },
    idNumber: {
      type: "string",
      description: "Número de documento de la persona",
    },
    birthdate: {
      type: "string",
      description: "Fecha de nacimiento de la persona",
      valueHint: "DD/MM/AAAA",
    },
    userToAlertChatId: {
      type: "string",
      description: "Chat ID donde enviar alertas de resultado",
      valueHint: "57XXXXXXXXXX@c.us",
    },
    successAlertMessage: {
      type: "string",
      description:
        "Mensaje a enviar cuando el proceso se completa exitosamente",
    },
    nothingToRenewAlertMessage: {
      type: "string",
      description: "Mensaje a enviar cuando no hay medicamentos para renovar",
    },
    techAlertChatId: {
      type: "string",
      description: "Chat ID donde enviar alertas/errores técnicos",
      valueHint: "57XXXXXXXXXX@c.us",
    },
  },
  run: async ({ args }) => {
    const config = resolveConfig(args);
    const whatsapp = new WhatsAppWebJsAdapter();

    await startRenewal(config, whatsapp);
  },
});
