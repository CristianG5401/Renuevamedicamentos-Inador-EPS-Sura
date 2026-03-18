import qrcode from "qrcode-terminal";
import { createActor } from "xstate";

import { WhatsAppWebJsAdapter } from "./adapters/whatsappWebJs.ts";
import { ENV, maskPhone } from "./config.ts";
import { EVENTS, renewMedsMachine } from "./domain/renewMedsMachine.ts";
import { parseEpsMessage } from "./ports/mappers/parseMessage.ts";
import { createActorServices } from "./services/actorServices.ts";

// --- Configuración ---

const whatsapp = new WhatsAppWebJsAdapter();

const renewMedsMachineWithDeps = renewMedsMachine.provide(
  createActorServices(whatsapp),
);

const actor = createActor(renewMedsMachineWithDeps, {
  input: {
    idType: ENV.ID_TYPE,
    idNumber: ENV.ID_NUMBER,
    birthdate: ENV.BIRTHDATE,
    userToAlertChatId: ENV.USER_TO_ALERT_CHAT_ID,
    successAlertMessage: ENV.SUCCESS_ALERT_MESSAGE,
    nothingToRenewAlertMessage: ENV.NOTHING_TO_RENEW_ALERT_MESSAGE,
  },
});

// --- Suscripción al actor ---

// TODO: Mejorar el logging — buscar una alternativa estilo CLI/TUI
actor.subscribe({
  next(snapshot) {
    console.log("--------------------------------------------------");
    console.log(`\nEstado: [${snapshot.value}]`);
    console.log(`Contexto:`, snapshot.context); // TODO: Remover en producción
    console.log(`Chat EPS: ${maskPhone(ENV.EPS_CHAT_ID)}`);
    console.log("--------------------------------------------------\n");
  },
  async complete() {
    console.log("Máquina finalizada, cerrando cliente de WhatsApp...");
    await whatsapp.destroy();
    console.log("Cliente de WhatsApp cerrado");
    console.log("Saliendo del programa...");
    process.exit(0);
  },
  async error(error) {
    console.log("--------------------------------------------------");
    console.log(
      "Máquina finalizada, con errores, enviando alerta por WS a usuario encargado...",
    );
    await whatsapp.sendMessage(
      ENV.TECH_ALERT_CHAT_ID,
      `El bot de la EPS falló, por favor revisa el log para más información: ${error}`,
    );
    console.error("** 🐞 Error en la máquina de estados **", error);
    await whatsapp.destroy();
    console.log("Cliente de WhatsApp cerrado");
    console.log("Saliendo del programa...");
    console.log("--------------------------------------------------\n");
    throw error;
  },
});

// --- Inicio ---

actor.start();

whatsapp.onQr((qr) => {
  qrcode.generate(qr, { small: true });
  console.log("Escanea el código QR con tu WhatsApp");
});

whatsapp.onReady(() => {
  console.log("¡Cliente de WhatsApp listo y conectado!");
  actor.send({ type: EVENTS.WS_CLIENT_READY });
});

whatsapp.onMessage((msg) => {
  if (msg.from !== ENV.EPS_CHAT_ID) return;

  actor.send({
    type: EVENTS.MESSAGE_RECEIVED,
    msg: parseEpsMessage(msg),
  });
});

whatsapp.initialize();
