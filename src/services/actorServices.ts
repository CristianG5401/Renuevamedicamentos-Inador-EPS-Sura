import { consola } from "consola";
import { fromPromise } from "xstate";

import type { WhatsAppPort } from "../ports/whatsappPort";

const TYPING_SIMULATION_DELAY_MS = 2000;

/** Utilidad para simular el tiempo de tecleo antes de enviar un mensaje. */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Crea las implementaciones reales de los actores para la máquina de estados.
 * Depende de WhatsAppPort (abstracción), no de ninguna librería concreta.
 * @param port - Adaptador de WhatsApp que implementa la interfaz port
 * @param epsChatId - Chat ID de la EPS para enviar mensajes por defecto
 */
export function createActorServices(port: WhatsAppPort, epsChatId: string) {
  return {
    actors: {
      sendMessageService: fromPromise(
        async ({ input }: { input: { message: string; chatId?: string } }) => {
          const { message, chatId = epsChatId } = input;

          await delay(TYPING_SIMULATION_DELAY_MS);

          const messageId = await port.sendMessage(chatId, message);

          consola.debug("Mensaje enviado", { messageId, message });

          return messageId;
        },
      ),
    },
  };
}
