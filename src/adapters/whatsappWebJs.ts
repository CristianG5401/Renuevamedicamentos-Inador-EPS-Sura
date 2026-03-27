import { Client, LocalAuth } from "whatsapp-web.js";

import type {
  IncomingMessage,
  ListOption,
  WhatsAppPort,
} from "../ports/whatsappPort";

/**
 * Estructura de datos crudos extraída de los mensajes de whatsapp-web.js.
 * Es específica de la librería y puede cambiar entre versiones.
 */
interface RawMessageData {
  list?: {
    body: string;
    buttonText: string;
    description: string;
    sections: { rows: ListOption[] }[];
  };
  dynamicReplyButtons?: {
    buttonId: string;
    buttonText: { displayText: string };
    type: number;
  }[];
}

/**
 * Adaptador de WhatsApp respaldado por whatsapp-web.js + Puppeteer.
 * Este es el único archivo del proyecto que importa de "whatsapp-web.js".
 */
export class WhatsAppWebJsAdapter implements WhatsAppPort {
  private client: Client;

  constructor() {
    this.client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: { headless: true },
    });
  }

  async initialize(): Promise<void> {
    await this.client.initialize();
  }

  async destroy(): Promise<void> {
    await this.client.destroy();
  }

  async sendMessage(chatId: string, message: string): Promise<string> {
    const sentMessage = await this.client.sendMessage(chatId, message, {
      waitUntilMsgSent: true,
    });

    if (!sentMessage?.id?.id) {
      throw new Error("No se pudo enviar el mensaje", { cause: sentMessage });
    }

    return sentMessage.id.id;
  }

  onQr(handler: (qr: string) => void): void {
    this.client.on("qr", handler);
  }

  onReady(handler: () => void): void {
    this.client.on("ready", handler);
  }

  onMessage(handler: (msg: IncomingMessage) => void): void {
    this.client.on("message", (msg) => {
      const rawData = msg.rawData as unknown as RawMessageData;

      handler({
        from: msg.from,
        body: msg.body,
        type: msg.type,
        list: rawData?.list
          ? {
              description: rawData.list.description,
              sections: rawData.list.sections,
            }
          : undefined,
        dynamicReplyButtons: rawData?.dynamicReplyButtons?.map((button) => ({
          displayText: button.buttonText.displayText,
        })),
      });
    });
  }
}
