import { defineCommand } from "citty";

// Constantes
import { ID_TYPES_ARRAY } from "../domain/constants";
// Configuración
import { ENV } from "../config";
// Adapter
import { WhatsAppWebJsAdapter } from "../adapters/whatsappWebJs";
// Bot
import { runRenewMedsBot } from "../bot";

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
      required: true,
    },
    idNumber: {
      type: "string",
      description: "Número de documento de la persona",
      required: true,
    },
    birthdate: {
      type: "string",
      description: "Fecha de nacimiento de la persona",
      valueHint: "DD/MM/AAAA",
      required: true,
    },
    userToAlertChatId: {
      type: "string",
      description: "Chat ID donde enviar alertas de resultado",
      required: false,
      valueHint: "57XXXXXXXXXX@c.us",
      default: ENV.USER_TO_ALERT_CHAT_ID,
    },
    successAlertMessage: {
      type: "string",
      description:
        "Mensaje a enviar cuando el proceso se completa exitosamente",
      required: false,
      default: ENV.SUCCESS_ALERT_MESSAGE,
    },
    nothingToRenewAlertMessage: {
      type: "string",
      description: "Mensaje a enviar cuando no hay medicamentos para renovar",
      required: false,
      default: ENV.NOTHING_TO_RENEW_ALERT_MESSAGE,
    },
    techAlertChatId: {
      type: "string",
      description: "Chat ID donde enviar alertas/errores técnicos",
      required: false,
      valueHint: "57XXXXXXXXXX@c.us",
      default: ENV.TECH_ALERT_CHAT_ID,
    },
  },
  run: ({ args }) => {
    const whatsapp = new WhatsAppWebJsAdapter();

    runRenewMedsBot(
      {
        idNumber: args.idNumber,
        idType: args.idType,
        birthdate: args.birthdate,
        userToAlertChatId: args.userToAlertChatId,
        successAlertMessage: args.successAlertMessage,
        nothingToRenewAlertMessage: args.nothingToRenewAlertMessage,
        techAlertChatId: args.techAlertChatId,
      },
      whatsapp,
    );
  },
});
