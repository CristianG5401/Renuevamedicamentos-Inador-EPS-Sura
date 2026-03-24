import { consola } from "consola";
import qrcode from "qrcode-terminal";
import { createActor } from "xstate";

import { WhatsAppWebJsAdapter } from "./adapters/whatsappWebJs";
import type { ValidatedConfig } from "./config";
import { maskPhone } from "./config";
import { EVENTS, renewMedsMachine } from "./domain/renewMedsMachine";
import { parseEpsMessage } from "./ports/mappers/parseMessage";
import { createActorServices } from "./services/actorServices";

/**
 * Ejecuta el flujo completo de renovación de medicamentos.
 * Inicializa WhatsApp, crea el actor XState, y maneja el ciclo de vida completo.
 * Retorna una Promise que se resuelve al finalizar exitosamente,
 * o se rechaza si ocurre un error en la máquina de estados.
 * @param config - Configuración validada con todos los campos requeridos
 */
export async function startRenewal(config: ValidatedConfig): Promise<void> {
  const whatsapp = new WhatsAppWebJsAdapter();

  const renewMedsMachineWithDeps = renewMedsMachine.provide(
    createActorServices(whatsapp, config.epsChatId),
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

  const actorCompleted = new Promise<void>((resolve, reject) => {
    actor.subscribe({
      next(snapshot) {
        consola.box(
          `Estado: [${snapshot.value}]\nChat EPS: ${maskPhone(config.epsChatId)}`,
        );
      },
      async complete() {
        consola.success("Máquina finalizada, cerrando cliente de WhatsApp...");
        await whatsapp.destroy();
        consola.info("Cliente de WhatsApp cerrado");
        resolve();
      },
      async error(error) {
        consola.error(
          "Máquina finalizada con errores, enviando alerta técnica...",
        );
        await whatsapp.sendMessage(
          config.techAlertChatId,
          `El bot de la EPS falló, por favor revisa el log para más información: ${error}`,
        );
        consola.error("Error en la máquina de estados", error);
        await whatsapp.destroy();
        consola.info("Cliente de WhatsApp cerrado");
        reject(error);
      },
    });
  });

  actor.start();

  whatsapp.onQr((qr) => {
    qrcode.generate(qr, { small: true });
    consola.info("Escanea el código QR con tu WhatsApp");
  });

  whatsapp.onReady(() => {
    consola.success("¡Cliente de WhatsApp listo y conectado!");
    actor.send({ type: EVENTS.WS_CLIENT_READY });
  });

  whatsapp.onMessage((msg) => {
    if (msg.from !== config.epsChatId) return;

    actor.send({
      type: EVENTS.MESSAGE_RECEIVED,
      msg: parseEpsMessage(msg),
    });
  });

  whatsapp.initialize();

  return actorCompleted;
}
