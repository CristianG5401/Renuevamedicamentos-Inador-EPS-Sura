import { test, expect, mock } from "bun:test";
import { startRenewal, createActorObserver } from "../orchestrator";
import { createMockWhatsAppPort } from "./mocks/mockWhatsAppPort";
import type { ValidatedConfig } from "../config";

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

test("rejects when whatsapp.initialize() fails", async () => {
  const initError = new Error("Puppeteer failed to launch");
  const whatsapp = createMockWhatsAppPort({
    initialize: () => Promise.reject(initError),
  });

  const result = startRenewal(VALID_CONFIG, whatsapp);

  await expect(result).rejects.toThrow("Puppeteer failed to launch");
});

test("complete() resolves after successful cleanup", async () => {
  const resolve = mock(() => {});
  const reject = mock(() => {});
  const whatsapp = createMockWhatsAppPort();

  const observer = createActorObserver(resolve, reject, whatsapp, VALID_CONFIG);
  await observer.complete();

  expect(resolve).toHaveBeenCalledTimes(1);
  expect(reject).not.toHaveBeenCalled();
});

test("complete() rejects when destroy() throws", async () => {
  const resolve = mock(() => {});
  const reject = mock(() => {});
  const destroyError = new Error("Browser already closed");
  const whatsapp = createMockWhatsAppPort({
    destroy: () => Promise.reject(destroyError),
  });

  const observer = createActorObserver(resolve, reject, whatsapp, VALID_CONFIG);
  await observer.complete();

  expect(reject).toHaveBeenCalledWith(destroyError);
  expect(resolve).not.toHaveBeenCalled();
});

test("error() rejects with original error after sending alert", async () => {
  const resolve = mock(() => {});
  const reject = mock(() => {});
  const whatsapp = createMockWhatsAppPort();
  const machineError = new Error("Machine failed");

  const observer = createActorObserver(resolve, reject, whatsapp, VALID_CONFIG);
  await observer.error(machineError);

  expect(reject).toHaveBeenCalledWith(machineError);
  expect(resolve).not.toHaveBeenCalled();
});

test("error() rejects with original error even when cleanup fails", async () => {
  const resolve = mock(() => {});
  const reject = mock(() => {});
  const machineError = new Error("Machine failed");
  const whatsapp = createMockWhatsAppPort({
    sendMessage: () => Promise.reject(new Error("Network down")),
    destroy: () => Promise.reject(new Error("Already closed")),
  });

  const observer = createActorObserver(resolve, reject, whatsapp, VALID_CONFIG);
  await observer.error(machineError);

  expect(reject).toHaveBeenCalledWith(machineError);
});
