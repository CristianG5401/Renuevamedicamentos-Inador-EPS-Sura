import { describe, it, expect, mock } from "bun:test";
import { startRenewal, createActorObserver } from "../orchestrator";
import { createMockWhatsAppPort } from "./mocks/mockWhatsAppPort";
import type { ValidatedConfig } from "../application/config/types";

const VALID_CONFIG: ValidatedConfig = {
  idType: "Cédula de ciudadanía",
  idNumber: "123456789",
  birthdate: "01/01/1990",
  epsChatId: "57000@c.us",
  userToAlertChatId: "57001@c.us",
  successAlertMessage: "ok",
  nothingToRenewAlertMessage: "nada",
  techAlertChatId: "57002@c.us",
};

describe("startRenewal", () => {
  it("should reject when whatsapp.initialize() fails", async () => {
    // Arrange
    const initError = new Error("Puppeteer failed to launch");
    const whatsapp = createMockWhatsAppPort({
      initialize: () => Promise.reject(initError),
    });

    // Act
    const result = startRenewal(VALID_CONFIG, whatsapp);

    // Assert
    await expect(result).rejects.toThrow("Puppeteer failed to launch");
  });
});

describe("createActorObserver", () => {
  describe("complete()", () => {
    it("should resolve after successful cleanup", async () => {
      // Arrange
      const resolve = mock(() => {});
      const reject = mock(() => {});
      const whatsapp = createMockWhatsAppPort();
      const observer = createActorObserver(resolve, reject, whatsapp, VALID_CONFIG);

      // Act
      await observer.complete();

      // Assert
      expect(resolve).toHaveBeenCalledTimes(1);
      expect(reject).not.toHaveBeenCalled();
    });

    it("should reject when destroy() throws", async () => {
      // Arrange
      const resolve = mock(() => {});
      const reject = mock(() => {});
      const destroyError = new Error("Browser already closed");
      const whatsapp = createMockWhatsAppPort({
        destroy: () => Promise.reject(destroyError),
      });
      const observer = createActorObserver(resolve, reject, whatsapp, VALID_CONFIG);

      // Act
      await observer.complete();

      // Assert
      expect(reject).toHaveBeenCalledWith(destroyError);
      expect(resolve).not.toHaveBeenCalled();
    });
  });

  describe("error()", () => {
    it("should reject with original error after sending alert", async () => {
      // Arrange
      const resolve = mock(() => {});
      const reject = mock(() => {});
      const whatsapp = createMockWhatsAppPort();
      const machineError = new Error("Machine failed");
      const observer = createActorObserver(resolve, reject, whatsapp, VALID_CONFIG);

      // Act
      await observer.error(machineError);

      // Assert
      expect(reject).toHaveBeenCalledWith(machineError);
      expect(resolve).not.toHaveBeenCalled();
    });

    it("should reject with original error even when cleanup fails", async () => {
      // Arrange
      const resolve = mock(() => {});
      const reject = mock(() => {});
      const machineError = new Error("Machine failed");
      const whatsapp = createMockWhatsAppPort({
        sendMessage: () => Promise.reject(new Error("Network down")),
        destroy: () => Promise.reject(new Error("Already closed")),
      });
      const observer = createActorObserver(resolve, reject, whatsapp, VALID_CONFIG);

      // Act
      await observer.error(machineError);

      // Assert
      expect(reject).toHaveBeenCalledWith(machineError);
    });
  });
});
