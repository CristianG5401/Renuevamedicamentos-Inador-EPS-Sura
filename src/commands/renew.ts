import { defineCommand } from "citty";

import { resolveConfig } from "../config";
import { startRenewal } from "../orchestrator";

export default defineCommand({
  meta: {
    name: "renew",
    description: "Ejecuta el flujo completo de renovación de medicamentos",
  },
  args: {
    "id-number": {
      type: "string",
      description: "Número de documento de identidad (sobreescribe .env)",
    },
    "id-type": {
      type: "string",
      description:
        "Tipo de documento, ej: 'Cédula de ciudadanía' (sobreescribe .env)",
    },
    birthdate: {
      type: "string",
      description:
        "Fecha de nacimiento en formato DD/MM/AAAA (sobreescribe .env)",
    },
    "eps-chat-id": {
      type: "string",
      description: "Chat ID de WhatsApp de la EPS (sobreescribe .env)",
    },
  },
  async run({ args }) {
    const config = resolveConfig({
      idNumber: args["id-number"],
      idType: args["id-type"],
      birthdate: args.birthdate,
      epsChatId: args["eps-chat-id"],
    });

    await startRenewal(config);
  },
});
