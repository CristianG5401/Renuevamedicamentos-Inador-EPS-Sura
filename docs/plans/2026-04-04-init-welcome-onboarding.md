# Init Welcome & Guided Onboarding — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Resolve the TODO at `src/commands/init.ts:27-29` by adding a welcome banner, inline field hints, and a masked preview of the existing config before the overwrite prompt.

**Architecture:** Create a `src/commands/init/presentation.ts` module with pure presentation helpers (`showWelcomeBanner`, `showFieldHint`, `showExistingConfig`). The `init.ts` command stays the flow orchestrator and calls these helpers at the right moments. Follows TDD for the helpers that contain real logic (hint lookup, masking application) — the purely visual banner is covered by a light assertion on the config path inclusion.

**Design reference:** `docs/plans/2026-04-03-init-welcome-onboarding-design.md`

**Tech Stack:** Bun test runner, TypeScript, consola (UnJS), citty

**Git policy:** The user handles commits. This plan does **not** include commit steps — each task ends with verification.

---

## Testing strategy

- Use `spyOn` from `bun:test` to observe calls to `consola.info` / `consola.box`.
- Restore spies in `afterEach` to avoid cross-test pollution.
- Focus tests on the logic that can actually be wrong: masking of sensitive fields and hint lookup. Do not assert on exact banner text (visual-only).
- Place tests at `src/__tests__/commands/init/presentation.test.ts`, mirroring the source path.

---

### Task 1: Scaffold test file with first failing test for `showExistingConfig` masking

**Files:**
- Create: `src/__tests__/commands/init/presentation.test.ts`

**Step 1: Create the test file with a failing test**

Write this content to `src/__tests__/commands/init/presentation.test.ts`:

```ts
import { describe, it, expect, spyOn, afterEach } from "bun:test";
import consola from "consola";
import { showExistingConfig } from "../../../commands/init/presentation";
import type { ValidatedConfig } from "../../../config/types";

const FULL_CONFIG: ValidatedConfig = {
  idType: "Cédula de ciudadanía",
  idNumber: "1234567890",
  birthdate: "01/01/1990",
  epsChatId: "573001234567@c.us",
  userToAlertChatId: "573007654321@c.us",
  successAlertMessage: "Renovación exitosa",
  nothingToRenewAlertMessage: "No hay nada por renovar",
  techAlertChatId: "573009999999@c.us",
};

describe("showExistingConfig", () => {
  afterEach(() => {
    // Restore spies so tests don't leak into each other.
    // spyOn replaces the method; .mockRestore() puts the original back.
  });

  it("should mask idNumber when displaying the existing config", () => {
    // Arrange
    const infoSpy = spyOn(consola, "info").mockImplementation(() => {});

    // Act
    showExistingConfig(FULL_CONFIG);

    // Assert — the raw idNumber must NEVER appear in any info call.
    const allCalls = infoSpy.mock.calls.flat().join(" ");
    expect(allCalls).not.toContain("1234567890");
    // And the masked form must appear.
    expect(allCalls).toContain("123***7890");

    infoSpy.mockRestore();
  });
});
```

**Step 2: Run the test and verify it fails**

Run: `bun test src/__tests__/commands/init/presentation.test.ts`

Expected: FAIL with a module-not-found error like `Cannot find module '../../../commands/init/presentation'` — the source file doesn't exist yet.

---

### Task 2: Create `presentation.ts` with minimal `showExistingConfig` to pass the test

**Files:**
- Create: `src/commands/init/presentation.ts`

**Step 1: Write the minimal implementation**

```ts
/**
 * Presentation helpers for the `init` command: welcome banner,
 * inline field hints, and masked preview of an existing config.
 *
 * Pure side-effect functions — they print to consola but return nothing.
 */

import consola from "consola";
import { maskIdNumber, maskPhone } from "../../utils/masking";
import type { ValidatedConfig } from "../../config/types";

/**
 * Displays an existing config to the user with sensitive fields masked.
 * Called before asking whether to overwrite so the user can see what's there.
 */
export function showExistingConfig(config: ValidatedConfig): void {
  consola.info(`Número de documento: ${maskIdNumber(config.idNumber)}`);
}
```

**Step 2: Run the test and verify it passes**

Run: `bun test src/__tests__/commands/init/presentation.test.ts`

Expected: PASS — the one test about masking `idNumber` is green.

**Step 3: Type check**

Run: `bunx tsc --noEmit`

Expected: no type errors.

---

### Task 3: Add failing tests for phone masking on all ChatID fields

**Files:**
- Modify: `src/__tests__/commands/init/presentation.test.ts`

**Step 1: Append these tests inside the `describe("showExistingConfig", ...)` block**

```ts
  it("should mask epsChatId with maskPhone", () => {
    const infoSpy = spyOn(consola, "info").mockImplementation(() => {});
    showExistingConfig(FULL_CONFIG);
    const allCalls = infoSpy.mock.calls.flat().join(" ");
    expect(allCalls).not.toContain("573001234567@c.us");
    expect(allCalls).toContain("5730***4567@c.us");
    infoSpy.mockRestore();
  });

  it("should mask userToAlertChatId with maskPhone", () => {
    const infoSpy = spyOn(consola, "info").mockImplementation(() => {});
    showExistingConfig(FULL_CONFIG);
    const allCalls = infoSpy.mock.calls.flat().join(" ");
    expect(allCalls).not.toContain("573007654321@c.us");
    expect(allCalls).toContain("5730***4321@c.us");
    infoSpy.mockRestore();
  });

  it("should mask techAlertChatId with maskPhone", () => {
    const infoSpy = spyOn(consola, "info").mockImplementation(() => {});
    showExistingConfig(FULL_CONFIG);
    const allCalls = infoSpy.mock.calls.flat().join(" ");
    expect(allCalls).not.toContain("573009999999@c.us");
    expect(allCalls).toContain("5730***9999@c.us");
    infoSpy.mockRestore();
  });

  it("should display non-sensitive fields verbatim", () => {
    const infoSpy = spyOn(consola, "info").mockImplementation(() => {});
    showExistingConfig(FULL_CONFIG);
    const allCalls = infoSpy.mock.calls.flat().join(" ");
    expect(allCalls).toContain("Cédula de ciudadanía");
    expect(allCalls).toContain("01/01/1990");
    expect(allCalls).toContain("Renovación exitosa");
    expect(allCalls).toContain("No hay nada por renovar");
    infoSpy.mockRestore();
  });
```

**Step 2: Run the tests and verify the new ones fail**

Run: `bun test src/__tests__/commands/init/presentation.test.ts`

Expected: the original `idNumber` test still passes; the four new tests FAIL because the minimal implementation only handles `idNumber`.

---

### Task 4: Extend `showExistingConfig` to cover all fields

**Files:**
- Modify: `src/commands/init/presentation.ts`

**Step 1: Replace the `showExistingConfig` body**

```ts
export function showExistingConfig(config: ValidatedConfig): void {
  consola.info(`Tipo de documento: ${config.idType}`);
  consola.info(`Número de documento: ${maskIdNumber(config.idNumber)}`);
  consola.info(`Fecha de nacimiento: ${config.birthdate}`);
  consola.info(`Chat ID de la EPS: ${maskPhone(config.epsChatId)}`);
  consola.info(
    `Chat ID para alertas de resultado: ${maskPhone(config.userToAlertChatId)}`,
  );
  consola.info(`Mensaje de éxito: ${config.successAlertMessage}`);
  consola.info(
    `Mensaje cuando no hay nada por renovar: ${config.nothingToRenewAlertMessage}`,
  );
  consola.info(
    `Chat ID para alertas técnicas: ${maskPhone(config.techAlertChatId)}`,
  );
}
```

**Step 2: Run all tests and verify they pass**

Run: `bun test src/__tests__/commands/init/presentation.test.ts`

Expected: all 5 tests in `showExistingConfig` pass.

**Step 3: Type check**

Run: `bunx tsc --noEmit`

Expected: no errors.

---

### Task 5: Add failing tests for `showFieldHint`

**Files:**
- Modify: `src/__tests__/commands/init/presentation.test.ts`

**Step 1: Add the import and a new `describe` block**

At the top, update the import line:

```ts
import { showExistingConfig, showFieldHint } from "../../../commands/init/presentation";
```

At the bottom of the file, append:

```ts
describe("showFieldHint", () => {
  it("should print a hint for epsChatId that mentions how to find it", () => {
    const infoSpy = spyOn(consola, "info").mockImplementation(() => {});
    showFieldHint("epsChatId");
    const output = infoSpy.mock.calls.flat().join(" ");
    // Assert only on the essential concept — not exact wording —
    // so we don't bind tests to prose.
    expect(output.toLowerCase()).toContain("whatsapp");
    infoSpy.mockRestore();
  });

  it("should print a hint for birthdate with the expected format", () => {
    const infoSpy = spyOn(consola, "info").mockImplementation(() => {});
    showFieldHint("birthdate");
    const output = infoSpy.mock.calls.flat().join(" ");
    expect(output).toContain("DD/MM/AAAA");
    infoSpy.mockRestore();
  });

  it("should do nothing for fields without a registered hint", () => {
    const infoSpy = spyOn(consola, "info").mockImplementation(() => {});
    // "idType" is a select list — self-explanatory, so no hint registered.
    showFieldHint("idType");
    expect(infoSpy).not.toHaveBeenCalled();
    infoSpy.mockRestore();
  });
});
```

**Step 2: Run tests and verify the new ones fail**

Run: `bun test src/__tests__/commands/init/presentation.test.ts`

Expected: FAIL with `showFieldHint is not a function` (or similar) — function not yet exported.

---

### Task 6: Implement `showFieldHint`

**Files:**
- Modify: `src/commands/init/presentation.ts`

**Step 1: Add the hint map and function**

Append at the end of the file:

```ts
/**
 * Inline hint text for each field, keyed by the field name in `ValidatedConfig`.
 * Fields not present here are considered self-explanatory and show no hint.
 */
const FIELD_HINTS: Partial<Record<keyof ValidatedConfig, string>> = {
  birthdate: "Formato esperado: DD/MM/AAAA",
  epsChatId:
    "Es el identificador del chat de tu EPS en WhatsApp. Para encontrarlo, abre WhatsApp Web, entra al chat de la EPS y mira el final de la URL (ej: 573001234567@c.us).",
  userToAlertChatId:
    "Es el chat en WhatsApp donde recibirás las alertas de éxito o 'nada por renovar'. Se obtiene igual que el Chat ID de la EPS, desde WhatsApp Web.",
  successAlertMessage:
    "Este mensaje se envía cuando el proceso termina exitosamente.",
  nothingToRenewAlertMessage:
    "Este mensaje se envía cuando no hay medicamentos por renovar.",
  techAlertChatId:
    "Es el chat en WhatsApp donde recibirás los errores técnicos del bot. Se obtiene igual que el Chat ID de la EPS, desde WhatsApp Web.",
};

/**
 * Prints the inline hint for a given config field, if one is registered.
 * No-op for self-explanatory fields (e.g. `idType`, `idNumber`).
 */
export function showFieldHint(field: keyof ValidatedConfig): void {
  const hint = FIELD_HINTS[field];
  if (!hint) return;
  consola.info(hint);
}
```

**Step 2: Run tests and verify they pass**

Run: `bun test src/__tests__/commands/init/presentation.test.ts`

Expected: all `showFieldHint` tests pass, existing `showExistingConfig` tests still pass.

**Step 3: Type check**

Run: `bunx tsc --noEmit`

Expected: no errors.

---

### Task 7: Add failing test for `showWelcomeBanner`

**Files:**
- Modify: `src/__tests__/commands/init/presentation.test.ts`

**Step 1: Add import and test**

Update the import:

```ts
import {
  showExistingConfig,
  showFieldHint,
  showWelcomeBanner,
} from "../../../commands/init/presentation";
```

Append a new describe block:

```ts
describe("showWelcomeBanner", () => {
  it("should call consola.box and print the resolved config path", () => {
    const boxSpy = spyOn(consola, "box").mockImplementation(() => {});
    const infoSpy = spyOn(consola, "info").mockImplementation(() => {});

    showWelcomeBanner("/tmp/fake/config.json");

    // The banner itself must be rendered in a box.
    expect(boxSpy).toHaveBeenCalled();
    // The config path must appear somewhere in the info output so the
    // user knows exactly where the file will be written.
    const infoOutput = infoSpy.mock.calls.flat().join(" ");
    expect(infoOutput).toContain("/tmp/fake/config.json");

    boxSpy.mockRestore();
    infoSpy.mockRestore();
  });
});
```

**Step 2: Run tests and verify new test fails**

Run: `bun test src/__tests__/commands/init/presentation.test.ts`

Expected: FAIL — `showWelcomeBanner` is not exported.

---

### Task 8: Implement `showWelcomeBanner`

**Files:**
- Modify: `src/commands/init/presentation.ts`

**Step 1: Append the function**

```ts
/**
 * Prints the welcome banner shown at the start of `init`.
 * Explains what the command does and where the config file will live.
 *
 * @param configPath - Absolute path where the global config.json will be written.
 */
export function showWelcomeBanner(configPath: string): void {
  consola.box(
    "renuevamedicamentos-inador\nBot de renovación de medicamentos en SURA",
  );
  consola.info(
    "Este comando crea (o actualiza) tu archivo de configuración global.",
  );
  consola.info(`Ubicación: ${configPath}`);
  consola.info(
    "A continuación te pediremos tus datos personales y los chats de WhatsApp donde recibirás las alertas.",
  );
}
```

**Step 2: Run tests and verify they pass**

Run: `bun test src/__tests__/commands/init/presentation.test.ts`

Expected: all tests pass.

**Step 3: Run the full test suite**

Run: `bun test`

Expected: all tests across the project pass (no regressions in the orchestrator suite).

**Step 4: Type check**

Run: `bunx tsc --noEmit`

Expected: no errors.

---

### Task 9: Integrate presentation helpers into `init.ts`

**Files:**
- Modify: `src/commands/init.ts`

**Step 1: Add the import**

At the top of `src/commands/init.ts`, add after the existing imports:

```ts
import {
  showExistingConfig,
  showFieldHint,
  showWelcomeBanner,
} from "./init/presentation";
```

**Step 2: Remove the TODO and call `showWelcomeBanner` at the top of `run()`**

Delete lines 27-29 (the TODO comment block).

Inside `run: async () => {`, change the beginning from:

```ts
  run: async () => {
    const configPath = getConfigFilePath();
    const existingConfig = await loadGlobalConfig();
```

to:

```ts
  run: async () => {
    const configPath = getConfigFilePath();
    showWelcomeBanner(configPath);

    const existingConfig = await loadGlobalConfig();
```

**Step 3: Show existing config before the overwrite prompt**

Change the `if (existingConfig)` block from:

```ts
    if (existingConfig) {
      const shouldOverwrite = await consola.prompt(
        `Ya existe un archivo de configuración en ${configPath}. ¿Deseas sobreescribirlo?`,
        { type: "confirm", initial: false },
      );
```

to:

```ts
    if (existingConfig) {
      consola.info("Ya existe una configuración guardada:");
      showExistingConfig(existingConfig as ValidatedConfig);

      const shouldOverwrite = await consola.prompt(
        `¿Deseas sobreescribir el archivo en ${configPath}?`,
        { type: "confirm", initial: false },
      );
```

> Note: `loadGlobalConfig()` returns `Partial<ValidatedConfig> | null`. The cast to `ValidatedConfig` is safe here **only if** we assume a pre-existing file is complete. If the existing file may be partial, instead change the preview to accept `Partial<ValidatedConfig>` and guard each field — see the follow-up in Task 11.

**Step 4: Call `showFieldHint` before each prompt that has a registered hint**

Insert `showFieldHint("<fieldName>")` immediately before each prompt, matching the field names in `FIELD_HINTS`:

```ts
    const idType = await consola.prompt("Tipo de documento:", {
      type: "select",
      options: ID_TYPES_ARRAY,
    });
    if (typeof idType === "symbol") return;

    const idNumber = await promptText("Número de documento:", "1234567890");
    if (!idNumber) return;

    showFieldHint("birthdate");
    const birthdate = await promptText("Fecha de nacimiento:", "DD/MM/AAAA");
    if (!birthdate) return;

    showFieldHint("epsChatId");
    const epsChatId = await promptText(
      "Chat ID de la EPS en WhatsApp:",
      "57XXXXXXXXXX@c.us",
    );
    if (!epsChatId) return;

    showFieldHint("userToAlertChatId");
    const userToAlertChatId = await promptText(
      "Chat ID donde enviar alertas de resultado:",
      "57XXXXXXXXXX@c.us",
    );
    if (!userToAlertChatId) return;

    showFieldHint("successAlertMessage");
    const successAlertMessage = await promptText(
      "Mensaje cuando el proceso se completa exitosamente:",
    );
    if (!successAlertMessage) return;

    showFieldHint("nothingToRenewAlertMessage");
    const nothingToRenewAlertMessage = await promptText(
      "Mensaje cuando no hay medicamentos por renovar:",
    );
    if (!nothingToRenewAlertMessage) return;

    showFieldHint("techAlertChatId");
    const techAlertChatId = await promptText(
      "Chat ID donde enviar alertas/errores técnicos:",
      "57XXXXXXXXXX@c.us",
    );
    if (!techAlertChatId) return;
```

(`idType` and `idNumber` have no hints — they are self-explanatory.)

**Step 5: Type check**

Run: `bunx tsc --noEmit`

Expected: no errors.

**Step 6: Run the full test suite**

Run: `bun test`

Expected: all tests pass.

---

### Task 10: Manual smoke test

**Files:** none (runtime verification)

**Step 1: Remove any existing config file to test the fresh-init path**

```bash
mv ~/.config/renuevamedicamentos-inador/config.json ~/.config/renuevamedicamentos-inador/config.json.bak 2>/dev/null || true
```

**Step 2: Run `init` and verify the flow**

Run: `bun run src/cli.ts init`

Verify in the output:
- A boxed banner appears first with the tool name.
- The resolved config path is shown.
- The explanatory info lines appear before each relevant prompt (birthdate format, WhatsApp Web instructions, etc.).
- `idType` and `idNumber` have **no** hint before them.
- At the end, the config is written successfully.

Abort with Ctrl+C halfway if you don't want to fill in real values — just verify the banner and the first few hints render correctly.

**Step 3: Restore the backed-up config and test the overwrite path**

```bash
mv ~/.config/renuevamedicamentos-inador/config.json.bak ~/.config/renuevamedicamentos-inador/config.json
```

Run: `bun run src/cli.ts init`

Verify:
- The banner still appears.
- A preview of the existing config is shown with `idNumber` masked (e.g. `123***7890`) and all `*ChatId` fields masked (e.g. `5730***4567@c.us`).
- The raw `idNumber` and full phone numbers are **not** printed.
- The overwrite confirmation appears after the preview.
- Declining the overwrite exits cleanly.

---

### Task 11: Harden against partial existing configs (follow-up check)

**Files:**
- Modify: `src/commands/init/presentation.ts` (only if the check in step 1 reveals an issue)
- Modify: `src/__tests__/commands/init/presentation.test.ts` (only if the source changes)

**Step 1: Decide whether the cast in Task 9 step 3 is safe**

Read `src/config/global-store.ts` and `src/config/resolve.ts`. Answer:
- Does `loadGlobalConfig` guarantee a complete `ValidatedConfig` when it returns non-null, or can it return an object with missing fields?
- If partial configs are possible, the `showExistingConfig(existingConfig as ValidatedConfig)` cast in `init.ts` is a latent bug: missing fields would become `undefined` in the preview strings.

**Step 2: If partial configs are possible, make `showExistingConfig` tolerate them**

Change the parameter type to `Partial<ValidatedConfig>` and guard each line:

```ts
export function showExistingConfig(config: Partial<ValidatedConfig>): void {
  if (config.idType) consola.info(`Tipo de documento: ${config.idType}`);
  if (config.idNumber)
    consola.info(`Número de documento: ${maskIdNumber(config.idNumber)}`);
  // ... repeat for each field
}
```

Also remove the `as ValidatedConfig` cast in `init.ts`.

Add a test that calls `showExistingConfig({})` and asserts `infoSpy` was not called.

**Step 3: Re-run verification**

Run: `bun test && bunx tsc --noEmit`

Expected: everything green.

---

### Task 12: Final verification checklist

Before handing back:

- [ ] `bun test` — all tests pass (including 9+ new tests in `presentation.test.ts`).
- [ ] `bunx tsc --noEmit` — no type errors.
- [ ] The TODO block at the old `src/commands/init.ts:27-29` is gone.
- [ ] `src/commands/init.ts` is under 200 lines.
- [ ] `src/commands/init/presentation.ts` is under 200 lines.
- [ ] Manual smoke test (Task 10) completed for both fresh-init and overwrite paths.
- [ ] Sensitive fields (`idNumber`, all `*ChatId`) never appear unmasked in the overwrite preview.
- [ ] The user can commit when ready — no auto-commits were made.
