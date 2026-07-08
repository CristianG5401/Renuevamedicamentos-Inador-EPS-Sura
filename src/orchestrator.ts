import qrcode from "qrcode-terminal";
import { consola } from "consola";
import { createActor } from "xstate";

import { resolveEpsChatIdsToListen } from "./application/config/epsChatIds";
// Tipos
import type { ValidatedConfig } from "./application/config/types";
import type { WhatsAppPort } from "./ports/whatsappPort";
// Máquina de estados
import { EVENTS, renewMedsMachine } from "./domain/renewMedsMachine";
// Mappers
import { parseEpsMessage } from "./ports/mappers/parseMessage";
// Servicios
import { createActorServices } from "./services/actorServices";
// Utils
import { maskPhone } from "./utils/masking";

//TODO: Usar path alias para las importaciones

export function isMessageFromEpsAllowlist(
  from: string,
  epsChatIdsToListen: readonly string[],
): boolean {
  return epsChatIdsToListen.includes(from);
}

export function formatEpsChatLogLines(config: ValidatedConfig): string {
  const epsChatIdsToListen = resolveEpsChatIdsToListen(
    config.epsChatId,
    config.epsChatIdsToListen,
  );

  return (
    `Chat EPS destino: ${maskPhone(config.epsChatId)}\n` +
    `Chats EPS escuchados: ${epsChatIdsToListen.map(maskPhone).join(", ")}`
  );
}

/**
 * Crea el observer que maneja el ciclo de vida del actor XState.
 * Extraído como función para permitir testing unitario de los callbacks.
 */
export function createActorObserver(
  resolve: () => void,
  reject: (error: unknown) => void,
  whatsapp: WhatsAppPort,
  config: ValidatedConfig,
) {
  return {
    next(snapshot: { value: unknown }) {
      consola.box(
        `Estado: [${snapshot.value}]\n${formatEpsChatLogLines(config)}`,
      );
    },
    async complete() {
      try {
        consola.success("Máquina finalizada, cerrando cliente de WhatsApp...");
        await whatsapp.destroy();
        consola.info("Cliente de WhatsApp cerrado");
        resolve();
      } catch (cleanupError) {
        reject(cleanupError);
      }
    },
    async error(error: unknown) {
      try {
        consola.error(
          "Máquina finalizada, con errores, enviando alerta por WS a usuario encargado...",
        );
        await whatsapp.sendMessage(
          config.techAlertChatId,
          `El bot de la EPS falló, por favor revisa el log para más información: ${error}`,
        );
        consola.error("**🐞 Error en la máquina de estados: ", error);
        await whatsapp.destroy();
        consola.info("Cliente de WhatsApp cerrado");
      } catch (cleanupError) {
        consola.error("**🐞 Error durante cleanup:", cleanupError);
      } finally {
        reject(error);
      }
    },
  };
}

/**
 * Ejecuta el flujo completo de renovación de medicamentos.
 * Inicializa WhatsApp, crea el actor XState, y maneja el ciclo de vida completo.
 * Retorna una Promise que se resuelve al finalizar exitosamente,
 * o se rechaza si ocurre un error en la máquina de estados.
 * @param config - Configuración validada con todos los campos requeridos
 * @param whatsapp - Implementación del port de WhatsApp (inyectada por el caller)
 */
export function startRenewal(
  config: ValidatedConfig,
  whatsapp: WhatsAppPort,
): Promise<void> {
  const epsChatIdsToListen = resolveEpsChatIdsToListen(
    config.epsChatId,
    config.epsChatIdsToListen,
  );

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

  // --- Suscripción al actor ---

  // TODO: Mejorar el logging — buscar una alternativa estilo CLI/TUI
  const actorCompleted = new Promise<void>((resolve, reject) => {
    actor.subscribe(createActorObserver(resolve, reject, whatsapp, config));

    // --- Inicio ---

    actor.start();

    whatsapp.onQr((qr) => {
      qrcode.generate(qr, { small: true });
      consola.info("Escanea el código QR con tu WhatsApp");
    });

    whatsapp.onReady(() => {
      consola.info("¡Cliente de WhatsApp listo y conectado!");
      actor.send({ type: EVENTS.WS_CLIENT_READY });
    });

    whatsapp.onMessage((msg) => {
      if (!isMessageFromEpsAllowlist(msg.from, epsChatIdsToListen)) return;

      actor.send({
        type: EVENTS.MESSAGE_RECEIVED,
        msg: parseEpsMessage(msg),
      });
    });

    whatsapp.initialize().catch(reject);
  });

  return actorCompleted;
}
