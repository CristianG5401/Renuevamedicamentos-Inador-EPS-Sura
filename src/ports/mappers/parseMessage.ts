import type { MessageFromEps } from "../../domain/types";
import type { IncomingMessage } from "../whatsappPort";

/**
 * Transforma un IncomingMessage (agnóstico de librería) al tipo de dominio
 * que la máquina de estados y los guards entienden.
 * @param msg - Mensaje normalizado proveniente del adaptador de WhatsApp
 * @returns Mensaje de dominio listo para la máquina de estados
 */
export function parseEpsMessage(msg: IncomingMessage): MessageFromEps {
  return {
    normalizedText: msg.body.toLowerCase(),
    type: msg.type,
    list: {
      description: msg.list?.description ?? "",
      sections: msg.list?.sections ?? [],
      options: msg.list?.sections?.flatMap((section) => section.rows) ?? [],
    },
    dynamicReplyButtons: {
      displayTexts:
        msg.dynamicReplyButtons?.map((button) => button.displayText) ?? [],
    },
  };
}
