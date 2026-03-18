import type { ListOption } from "../domain/types.ts";

/**
 * Estructura de mensaje normalizada, agnóstica de librería.
 * Cada adaptador de WhatsApp debe convertir sus mensajes crudos a este formato.
 */
export interface IncomingMessage {
  from: string;
  body: string;
  type: string;
  list?: {
    description?: string;
    sections?: { rows: ListOption[] }[];
  };
  dynamicReplyButtons?: {
    displayText: string;
  }[];
}

/**
 * Interfaz port — define lo que el bot necesita de cualquier cliente de WhatsApp.
 * Las implementaciones viven en `src/adapters/`.
 */
export interface WhatsAppPort {
  initialize(): Promise<void>;
  destroy(): Promise<void>;
  sendMessage(chatId: string, message: string): Promise<string>;
  onQr(handler: (qr: string) => void): void;
  onReady(handler: () => void): void;
  onMessage(handler: (msg: IncomingMessage) => void): void;
}
