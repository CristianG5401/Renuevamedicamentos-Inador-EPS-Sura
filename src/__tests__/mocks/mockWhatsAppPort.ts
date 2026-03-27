import type { IncomingMessage, WhatsAppPort } from "../../ports/whatsappPort";

/**
 * Mock de WhatsAppPort para tests.
 * Permite controlar qué callbacks se disparan y si los métodos fallan.
 */
export function createMockWhatsAppPort(
  overrides?: Partial<WhatsAppPort>,
): WhatsAppPort & {
  triggerReady: () => void;
  triggerMessage: (msg: IncomingMessage) => void;
  triggerQr: (qr: string) => void;
} {
  let onReadyHandler: (() => void) | undefined;
  let onMessageHandler: ((msg: IncomingMessage) => void) | undefined;
  let onQrHandler: ((qr: string) => void) | undefined;

  return {
    initialize: overrides?.initialize ?? (() => Promise.resolve()),
    destroy: overrides?.destroy ?? (() => Promise.resolve()),
    sendMessage:
      overrides?.sendMessage ??
      ((_chatId: string, _message: string) => Promise.resolve("mock-msg-id")),
    onQr: (handler) => {
      onQrHandler = handler;
    },
    onReady: (handler) => {
      onReadyHandler = handler;
    },
    onMessage: (handler) => {
      onMessageHandler = handler;
    },
    triggerReady: () => onReadyHandler?.(),
    triggerMessage: (msg) => onMessageHandler?.(msg),
    triggerQr: (qr) => onQrHandler?.(qr),
  };
}
