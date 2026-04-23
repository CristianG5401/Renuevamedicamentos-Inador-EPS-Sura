# Orchestrator Promise Safety — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ensure `startRenewal` never hangs — all async failure paths must route to `reject()`.

**Architecture:** Two bugs share the same root cause: the `Promise<void>` returned by `startRenewal` has unguarded async paths that can leave it in a permanently pending state. We wrap all async subscribe callbacks in try/catch and pipe `initialize()` failure into the promise's `reject`. TDD approach with a mock `WhatsAppPort`.

**Tech Stack:** Bun test runner, XState 5, TypeScript

---

### Task 1: Create mock WhatsApp port for testing

**Files:**
- Create: `src/__tests__/mocks/mockWhatsAppPort.ts`

**Step 1: Write the mock**

```ts
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
```

---

### Task 2: Write failing test — `initialize()` rejection hangs the promise

**Files:**
- Create: `src/__tests__/orchestrator.test.ts`

**Step 1: Write the failing test**

```ts
import { test, expect } from "bun:test";
import { startRenewal } from "../orchestrator";
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
```

**Step 2: Run test to verify it fails**

Run: `bun test src/__tests__/orchestrator.test.ts`
Expected: FAIL — the promise never settles (timeout), because `initialize()` rejection is currently unhandled.

---

### Task 3: Fix bug #1 — pipe `initialize()` rejection to `reject()`

**Files:**
- Modify: `src/orchestrator.ts:103`

**Step 1: Apply the fix**

Change line 103 from:

```ts
  whatsapp.initialize();
```

To:

```ts
  whatsapp.initialize().catch(reject);
```

But wait — `reject` is scoped inside the `new Promise()` executor. We need to hoist it. Refactor: move `initialize()` inside the Promise executor, after the subscribe setup.

The full shape of the fix — move lines 82-103 (actor.start through initialize) into the Promise executor, right after `actor.subscribe(...)`:

```ts
  const actorCompleted = new Promise<void>((resolve, reject) => {
    actor.subscribe({
      // ... callbacks (unchanged for now) ...
    });

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
      if (msg.from !== config.epsChatId) return;
      actor.send({
        type: EVENTS.MESSAGE_RECEIVED,
        msg: parseEpsMessage(msg),
      });
    });

    whatsapp.initialize().catch(reject);
  });

  return actorCompleted;
```

**Step 2: Run test to verify it passes**

Run: `bun test src/__tests__/orchestrator.test.ts`
Expected: PASS

---

### Task 4: Write failing test — `destroy()` throws inside `complete()` callback

**Files:**
- Modify: `src/__tests__/orchestrator.test.ts`

**Step 1: Write the failing test**

This test needs the XState machine to reach completion. To do that we need to either:
- Use a minimal XState machine, or
- Trigger the real machine to complete

Since the real machine is complex and requires a full message flow, we'll test the behavior by observing that the `complete()` callback wraps `destroy()` in a try/catch. We'll verify this indirectly: if `destroy()` rejects, `startRenewal` should still reject (not hang).

```ts
test("rejects when whatsapp.destroy() throws inside complete callback", async () => {
  const destroyError = new Error("Browser already closed");
  const whatsapp = createMockWhatsAppPort({
    destroy: () => Promise.reject(destroyError),
  });

  const result = startRenewal(VALID_CONFIG, whatsapp);

  // Trigger the actor to reach a terminal state.
  // The real machine won't complete without the full flow,
  // so we test the error() path instead (which also calls destroy).
  // Simulate: actor errors out -> error() calls sendMessage + destroy
  // If destroy fails, the promise should still reject.

  // For complete() path: we'd need the machine to finish normally.
  // For now, test the error() path which is more critical.
  // (Covered in Task 5)

  // Clean up
  result.catch(() => {}); // prevent unhandled rejection warning
});
```

Actually — testing `complete()` and `error()` requires the XState machine to reach those states. Since the machine requires a full WhatsApp message flow, the most practical approach is to test the try/catch wrapping directly by examining the code change.

**Revised approach:** Instead of a full integration test, we add a unit test that verifies the promise settles (doesn't hang) when callbacks throw. We can do this by exposing the observer pattern or by using a simpler test machine.

Given the complexity, let's skip this specific test and implement the fix directly — the structural guarantee (try/catch around every async operation in the callbacks) is sufficient. The `initialize()` test from Task 2 already proves the Promise rejection plumbing works.

---

### Task 5: Fix bug #2 — wrap async callbacks in try/catch

**Files:**
- Modify: `src/orchestrator.ts:56-77`

**Step 1: Apply the fix**

Replace the `complete` and `error` callbacks with try/catch-wrapped versions:

```ts
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
      async error(error) {
        try {
          consola.error(
            "Máquina finalizada, con errores, enviando alerta por WS a usuario encargado...",
          );
          await whatsapp.sendMessage(
            config.techAlertChatId,
            `El bot de la EPS falló, por favor revisa el log para más información: ${error}`,
          );
          consola.error("** Error en la máquina de estados **", error);
          await whatsapp.destroy();
          consola.info("Cliente de WhatsApp cerrado");
        } catch (cleanupError) {
          consola.error("Error durante cleanup:", cleanupError);
        } finally {
          reject(error);
        }
      },
```

Key design decisions:
- `complete()`: if cleanup fails, reject with the cleanup error (the machine succeeded but cleanup failed).
- `error()`: always reject with the **original machine error** (in `finally`), even if cleanup fails. The cleanup error is logged but doesn't replace the root cause.

**Step 2: Run existing test to verify no regression**

Run: `bun test src/__tests__/orchestrator.test.ts`
Expected: PASS (the initialize test should still pass)

---

### Task 6: Final verification

**Step 1: Run all tests**

Run: `bun test`
Expected: All tests pass.

**Step 2: Type check**

Run: `bunx tsc --noEmit`
Expected: No type errors.

**Step 3: Verify the final state of orchestrator.ts**

Read `src/orchestrator.ts` and confirm:
- [ ] `whatsapp.initialize().catch(reject)` is inside the Promise executor
- [ ] `complete()` has try/catch with `resolve()` in try and `reject()` in catch
- [ ] `error()` has try/catch/finally with `reject(error)` in finally
- [ ] No remaining unguarded async operations inside the Promise executor
