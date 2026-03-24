import qrcode from "qrcode-terminal";
import { createActor } from "xstate";

import { ENV, maskPhone } from "./config";
import { EVENTS, renewMedsMachine } from "./domain/renewMedsMachine";
import { parseEpsMessage } from "./ports/mappers/parseMessage";
import type { WhatsAppPort } from "./ports/whatsappPort";
import { createActorServices } from "./services/actorServices";

interface RenewMedsBotConfig {
  idType: string;
  idNumber: string;
  birthdate: string;
  userToAlertChatId: string;
  successAlertMessage: string;
  nothingToRenewAlertMessage: string;
  techAlertChatId: string;
}

//TODO: Usar path alias para las importaciones

/**
 * Inicializa y ejecuta el bot de renovación de medicamentos.
 * Crea la máquina de estados XState y conecta los eventos del cliente
 * de WhatsApp con las transiciones de la máquina.
 * @param config - Configuración del bot con datos del paciente y destinos de alertas
 * @param whatsapp - Implementación del port de WhatsApp (inyectada por el caller)
 */
export function runRenewMedsBot(config: RenewMedsBotConfig, whatsapp: WhatsAppPort) {

  const renewMedsMachineWithDeps = renewMedsMachine.provide(
    createActorServices(whatsapp),
  );

  const actor = createActor(renewMedsMachineWithDeps, {
    input: {
      idType: config.idType,
      idNumber: config.idNumber,
      birthdate: config.birthdate,
      userToAlertChatId: config.userToAlertChatId,
      successAlertMessage: config.successAlertMessage,
      nothingToRenewAlertMessage: config.nothingToRenewAlertMessage,
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
        config.techAlertChatId,
        `El bot de la EPS falló, por favor revisa el log para más información: ${error}`,
      );
      console.error("** 🐞 Error en la máquina de estados **", error);
      await whatsapp.destroy();
      console.log("Cliente de WhatsApp cerrado");
      console.log("Saliendo del programa...");
      console.log("--------------------------------------------------\n");

      process.exit(1);
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
}
