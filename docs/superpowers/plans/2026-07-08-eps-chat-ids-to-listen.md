# EPS Chat IDs To Listen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `EPS_CHAT_IDS_TO_LISTEN` / `epsChatIdsToListen` so the bot sends messages to one primary EPS chat while accepting inbound EPS messages from multiple configured chat IDs.

**Architecture:** Keep `epsChatId` as the outbound destination and introduce `epsChatIdsToListen` as a pipe-separated inbound allowlist. Centralize parsing/normalization in a small config helper, use that helper from `resolveConfig` and `orchestrator`, and update `init` presentation so users understand the separation.

**Tech Stack:** TypeScript, Bun test runner, XState, citty, consola, existing WhatsAppPort abstraction.

## Global Constraints

- Preserve backward compatibility: when `EPS_CHAT_IDS_TO_LISTEN` / `epsChatIdsToListen` is missing, listen only to `EPS_CHAT_ID` / `epsChatId`.
- Outbound EPS messages always use `epsChatId`; do not broadcast and do not switch the active outbound chat.
- `EPS_CHAT_IDS_TO_LISTEN` is a pipe-separated string, for example `573175180237@c.us|147626817245299@lid`.
- Parsing trims whitespace, ignores empty segments, deduplicates IDs, and always includes `epsChatId` in the final listen allowlist.
- Do not validate WhatsApp ID shape beyond non-empty strings; match the existing `epsChatId` behavior.
- Do not read or modify `.env`; update only `.env.example` for documentation.
- Do not commit unless the user explicitly approves committing during execution.

---

## File Structure

- Create `src/application/config/epsChatIds.ts`: pure helper for parsing and resolving the inbound EPS chat allowlist.
- Create `src/__tests__/application/config/epsChatIds.test.ts`: unit tests for trimming, empty chunks, dedupe, fallback, and primary inclusion.
- Create `src/__tests__/application/config/resolveConfig.test.ts`: tests for `EPS_CHAT_IDS_TO_LISTEN` env/global/fallback resolution.
- Modify `src/application/config/types.ts`: add `epsChatIdsToListen` to `ValidatedConfig`.
- Modify `src/application/config/resolveConfig.ts`: resolve the new config field without allowing CLI override.
- Modify `src/orchestrator.ts`: derive the listen allowlist, use it in `onMessage`, and log send/listen values separately.
- Modify `src/__tests__/orchestrator.test.ts`: update fixtures and cover the new allowlist predicate/log behavior.
- Modify `src/services/actorServices.ts` only if TypeScript changes require comment wording; behavior remains primary-chat-only.
- Modify `src/cli/commands/init/command.ts`: prompt for `epsChatIdsToListen` after `epsChatId`.
- Modify `src/cli/commands/init/presentation.ts`: add hint and masked preview for the new field.
- Modify `src/__tests__/cli/commands/init/presentation.test.ts`: update fixtures and add masking/hint tests.
- Modify `.env.example`: document `EPS_CHAT_IDS_TO_LISTEN`.

---

### Task 1: Config Helper And Type

**Files:**
- Create: `src/application/config/epsChatIds.ts`
- Create: `src/__tests__/application/config/epsChatIds.test.ts`
- Modify: `src/application/config/types.ts`

**Interfaces:**
- Produces: `parsePipeSeparatedChatIds(value: string | undefined): string[]`
- Produces: `resolveEpsChatIdsToListen(epsChatId: string, rawListenValue: string | undefined): string[]`
- Produces: `ValidatedConfig.epsChatIdsToListen: string`
- Consumes: no earlier task output

- [ ] **Step 1: Write the failing parser tests**

Create `src/__tests__/application/config/epsChatIds.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import {
  parsePipeSeparatedChatIds,
  resolveEpsChatIdsToListen,
} from "../../../application/config/epsChatIds";

describe("parsePipeSeparatedChatIds", () => {
  it("should split pipe-separated chat IDs", () => {
    expect(
      parsePipeSeparatedChatIds("573175180237@c.us|147626817245299@lid"),
    ).toEqual(["573175180237@c.us", "147626817245299@lid"]);
  });

  it("should trim whitespace and ignore empty chunks", () => {
    expect(
      parsePipeSeparatedChatIds(" 573175180237@c.us | | 147626817245299@lid "),
    ).toEqual(["573175180237@c.us", "147626817245299@lid"]);
  });

  it("should deduplicate IDs while preserving first occurrence order", () => {
    expect(
      parsePipeSeparatedChatIds(
        "573175180237@c.us|147626817245299@lid|573175180237@c.us",
      ),
    ).toEqual(["573175180237@c.us", "147626817245299@lid"]);
  });

  it("should return an empty array for missing or blank input", () => {
    expect(parsePipeSeparatedChatIds(undefined)).toEqual([]);
    expect(parsePipeSeparatedChatIds("  |  ")).toEqual([]);
  });
});

describe("resolveEpsChatIdsToListen", () => {
  it("should fall back to epsChatId when raw listen value is missing", () => {
    expect(resolveEpsChatIdsToListen("573175180237@c.us", undefined)).toEqual([
      "573175180237@c.us",
    ]);
  });

  it("should always include epsChatId when omitted from raw listen value", () => {
    expect(
      resolveEpsChatIdsToListen(
        "573175180237@c.us",
        "147626817245299@lid",
      ),
    ).toEqual(["147626817245299@lid", "573175180237@c.us"]);
  });

  it("should not duplicate epsChatId when already present", () => {
    expect(
      resolveEpsChatIdsToListen(
        "573175180237@c.us",
        "573175180237@c.us|147626817245299@lid",
      ),
    ).toEqual(["573175180237@c.us", "147626817245299@lid"]);
  });
});
```

- [ ] **Step 2: Run parser tests to verify they fail**

Run: `bun test src/__tests__/application/config/epsChatIds.test.ts`

Expected: FAIL because `src/application/config/epsChatIds.ts` does not exist.

- [ ] **Step 3: Add `epsChatIdsToListen` to `ValidatedConfig`**

Modify `src/application/config/types.ts`:

```ts
/**
 * Interfaz fuente de verdad para la configuración validada.
 * Todos los campos son strings requeridos.
 * Los tipos derivados (Partial, Omit) se usan en otros módulos.
 */
export interface ValidatedConfig {
  birthdate: string;
  epsChatId: string;
  epsChatIdsToListen: string;
  idNumber: string;
  idType: string;
  nothingToRenewAlertMessage: string;
  successAlertMessage: string;
  techAlertChatId: string;
  userToAlertChatId: string;
}
```

- [ ] **Step 4: Implement the config helper**

Create `src/application/config/epsChatIds.ts`:

```ts
export function parsePipeSeparatedChatIds(
  value: string | undefined,
): string[] {
  if (!value) return [];

  const uniqueChatIds: string[] = [];
  const seen = new Set<string>();

  for (const rawChunk of value.split("|")) {
    const chatId = rawChunk.trim();

    if (!chatId || seen.has(chatId)) continue;

    seen.add(chatId);
    uniqueChatIds.push(chatId);
  }

  return uniqueChatIds;
}

export function resolveEpsChatIdsToListen(
  epsChatId: string,
  rawListenValue: string | undefined,
): string[] {
  const chatIds = parsePipeSeparatedChatIds(rawListenValue);

  if (!chatIds.includes(epsChatId)) {
    chatIds.push(epsChatId);
  }

  return chatIds;
}
```

- [ ] **Step 5: Run parser tests to verify they pass**

Run: `bun test src/__tests__/application/config/epsChatIds.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit checkpoint only with approval**

If the user explicitly approved commits for this execution, run:

```bash
git add src/application/config/types.ts src/application/config/epsChatIds.ts src/__tests__/application/config/epsChatIds.test.ts
git commit -m "feat: add EPS chat listen parser"
```

Expected: commit succeeds. If commit approval was not given, skip this step and leave changes uncommitted.

---

### Task 2: Config Resolution And Env Example

**Files:**
- Modify: `src/application/config/resolveConfig.ts`
- Create: `src/__tests__/application/config/resolveConfig.test.ts`
- Modify: `.env.example`
- Modify: existing test fixtures that construct `ValidatedConfig`

**Interfaces:**
- Consumes: `ValidatedConfig.epsChatIdsToListen: string`
- Consumes: `resolveEpsChatIdsToListen(epsChatId: string, rawListenValue: string | undefined): string[]`
- Produces: `resolveConfig()` returns `epsChatIdsToListen` resolved from env, global config, or `epsChatId`

- [ ] **Step 1: Write failing config resolution tests**

Create `src/__tests__/application/config/resolveConfig.test.ts`:

```ts
import { afterEach, describe, expect, it, mock } from "bun:test";

const BASE_GLOBAL_CONFIG = {
  birthdate: "01/01/1990",
  epsChatId: "573175180237@c.us",
  idNumber: "123456789",
  idType: "Cédula de ciudadanía",
  nothingToRenewAlertMessage: "nada",
  successAlertMessage: "ok",
  techAlertChatId: "57002@c.us",
  userToAlertChatId: "57001@c.us",
};

const ENV_KEYS = [
  "BIRTHDATE",
  "EPS_CHAT_ID",
  "EPS_CHAT_IDS_TO_LISTEN",
  "ID_NUMBER",
  "ID_TYPE",
  "NOTHING_TO_RENEW_ALERT_MESSAGE",
  "SUCCESS_ALERT_MESSAGE",
  "TECH_ALERT_CHAT_ID",
  "USER_TO_ALERT_CHAT_ID",
] as const;

afterEach(() => {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
  mock.restore();
});

async function resolveWithGlobalConfig(globalConfig: Record<string, string>) {
  mock.module("../../../infrastructure/config/global-store", () => ({
    loadGlobalConfig: () => Promise.resolve(globalConfig),
  }));

  const { resolveConfig } = await import("../../../application/config/resolveConfig");

  return resolveConfig();
}

describe("resolveConfig epsChatIdsToListen", () => {
  it("should use EPS_CHAT_IDS_TO_LISTEN from env when present", async () => {
    process.env.EPS_CHAT_IDS_TO_LISTEN =
      "573175180237@c.us|147626817245299@lid";

    const config = await resolveWithGlobalConfig(BASE_GLOBAL_CONFIG);

    expect(config.epsChatIdsToListen).toBe(
      "573175180237@c.us|147626817245299@lid",
    );
  });

  it("should use epsChatIdsToListen from global config when env is absent", async () => {
    const config = await resolveWithGlobalConfig({
      ...BASE_GLOBAL_CONFIG,
      epsChatIdsToListen: "147626817245299@lid",
    });

    expect(config.epsChatIdsToListen).toBe("147626817245299@lid");
  });

  it("should fall back to epsChatId when listen config is absent", async () => {
    const config = await resolveWithGlobalConfig(BASE_GLOBAL_CONFIG);

    expect(config.epsChatIdsToListen).toBe("573175180237@c.us");
  });
});
```

- [ ] **Step 2: Run config resolution tests to verify they fail**

Run: `bun test src/__tests__/application/config/resolveConfig.test.ts`

Expected: FAIL because `epsChatIdsToListen` is not resolved yet.

- [ ] **Step 3: Update `resolveConfig`**

Modify `src/application/config/resolveConfig.ts` so the resolved object includes `epsChatIdsToListen` after `epsChatId` is known:

```ts
  const epsChatId = process.env.EPS_CHAT_ID ?? globalConfig.epsChatId;

  const resolved = {
    birthdate:
      overrides?.birthdate ??
      process.env.BIRTHDATE ??
      globalConfig.birthdate,
    idNumber:
      overrides?.idNumber ??
      process.env.ID_NUMBER ??
      globalConfig.idNumber,
    idType:
      overrides?.idType ?? process.env.ID_TYPE ?? globalConfig.idType,
    nothingToRenewAlertMessage:
      overrides?.nothingToRenewAlertMessage ??
      process.env.NOTHING_TO_RENEW_ALERT_MESSAGE ??
      globalConfig.nothingToRenewAlertMessage,
    successAlertMessage:
      overrides?.successAlertMessage ??
      process.env.SUCCESS_ALERT_MESSAGE ??
      globalConfig.successAlertMessage,
    techAlertChatId:
      overrides?.techAlertChatId ??
      process.env.TECH_ALERT_CHAT_ID ??
      globalConfig.techAlertChatId,
    userToAlertChatId:
      overrides?.userToAlertChatId ??
      process.env.USER_TO_ALERT_CHAT_ID ??
      globalConfig.userToAlertChatId,
    // epsChatId: SIN override de CLI — solo env o config global
    epsChatId,
    epsChatIdsToListen:
      process.env.EPS_CHAT_IDS_TO_LISTEN ??
      globalConfig.epsChatIdsToListen ??
      epsChatId,
  };
```

Keep the existing missing variable check after this object.

- [ ] **Step 4: Update `.env.example`**

Modify `.env.example`:

```txt
ID_TYPE=Cédula de ciudadanía
ID_NUMBER=1234567890
BIRTHDATE=DD/MM/AAAA
EPS_CHAT_ID=57XXXXXXXXXX@c.us
EPS_CHAT_IDS_TO_LISTEN=57XXXXXXXXXX@c.us|XXXXXXXXXXXX@lid
USER_TO_ALERT_CHAT_ID=57XXXXXXXXXX@c.us
SUCCESS_ALERT_MESSAGE=Tu mensaje de alerta aquí
NOTHING_TO_RENEW_ALERT_MESSAGE=Tu mensaje cuando no hay medicamentos por renovar
TECH_ALERT_CHAT_ID=57XXXXXXXXXX@c.us
```

- [ ] **Step 5: Update existing `ValidatedConfig` fixtures**

Update every object typed as `ValidatedConfig` to include:

```ts
epsChatIdsToListen: "57000@c.us|147626817245299@lid",
```

At minimum, update:

```txt
src/__tests__/orchestrator.test.ts
src/__tests__/cli/commands/init/presentation.test.ts
```

Use values that match each test's existing `epsChatId` when possible.

- [ ] **Step 6: Run config and type checks**

Run: `bun test src/__tests__/application/config/resolveConfig.test.ts src/__tests__/application/config/epsChatIds.test.ts`

Expected: PASS.

Run: `bunx tsc --noEmit`

Expected: PASS. If this fails because a `ValidatedConfig` fixture is missing `epsChatIdsToListen`, add the field to that fixture.

- [ ] **Step 7: Commit checkpoint only with approval**

If the user explicitly approved commits for this execution, run:

```bash
git add .env.example src/application/config/resolveConfig.ts src/__tests__/application/config/resolveConfig.test.ts src/__tests__/orchestrator.test.ts src/__tests__/cli/commands/init/presentation.test.ts
git commit -m "feat: resolve EPS listen chat IDs"
```

Expected: commit succeeds. If commit approval was not given, skip this step and leave changes uncommitted.

---

### Task 3: Orchestrator Listen Allowlist

**Files:**
- Modify: `src/orchestrator.ts`
- Modify: `src/__tests__/orchestrator.test.ts`

**Interfaces:**
- Consumes: `resolveEpsChatIdsToListen(epsChatId: string, rawListenValue: string | undefined): string[]`
- Produces: `isMessageFromEpsAllowlist(from: string, epsChatIdsToListen: readonly string[]): boolean`
- Produces: `formatEpsChatLogLines(config: ValidatedConfig): string`
- Produces: `startRenewal()` filters inbound WhatsApp messages by the resolved allowlist

- [ ] **Step 1: Write failing allowlist predicate tests**

Modify `src/__tests__/orchestrator.test.ts` imports:

```ts
import {
  startRenewal,
  createActorObserver,
  isMessageFromEpsAllowlist,
  formatEpsChatLogLines,
} from "../orchestrator";
```

Add tests:

```ts
describe("isMessageFromEpsAllowlist", () => {
  it("should accept messages from any configured EPS listen chat", () => {
    expect(
      isMessageFromEpsAllowlist("147626817245299@lid", [
        "57000@c.us",
        "147626817245299@lid",
      ]),
    ).toBe(true);
  });

  it("should reject messages outside the EPS listen allowlist", () => {
    expect(
      isMessageFromEpsAllowlist("99999@c.us", [
        "57000@c.us",
        "147626817245299@lid",
      ]),
    ).toBe(false);
  });
});

describe("formatEpsChatLogLines", () => {
  it("should mask send target and listen allowlist", () => {
    const output = formatEpsChatLogLines({
      ...VALID_CONFIG,
      epsChatId: "573175180237@c.us",
      epsChatIdsToListen: "573175180237@c.us|147626817245299@lid",
    });

    expect(output).not.toContain("573175180237@c.us");
    expect(output).not.toContain("147626817245299@lid");
    expect(output).toContain("5731***0237@c.us");
    expect(output).toContain("1476***5299@lid");
  });
});
```

- [ ] **Step 2: Run orchestrator tests to verify they fail**

Run: `bun test src/__tests__/orchestrator.test.ts`

Expected: FAIL because `isMessageFromEpsAllowlist` is not exported.

- [ ] **Step 3: Implement allowlist usage in orchestrator**

Modify `src/orchestrator.ts` imports:

```ts
import { resolveEpsChatIdsToListen } from "./application/config/epsChatIds";
```

Add this exported predicate near the top-level helpers:

```ts
export function isMessageFromEpsAllowlist(
  from: string,
  epsChatIdsToListen: readonly string[],
): boolean {
  return epsChatIdsToListen.includes(from);
}
```

Add this exported formatter near `isMessageFromEpsAllowlist`:

```ts
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
```

In `createActorObserver.next`, use the formatter:

```ts
    next(snapshot: { value: unknown }) {
      consola.box(`Estado: [${snapshot.value}]\n${formatEpsChatLogLines(config)}`);
    },
```

In `startRenewal`, compute the allowlist before registering message handlers:

```ts
  const epsChatIdsToListen = resolveEpsChatIdsToListen(
    config.epsChatId,
    config.epsChatIdsToListen,
  );
```

Replace the inbound filter:

```ts
      if (!isMessageFromEpsAllowlist(msg.from, epsChatIdsToListen)) return;
```

Leave this outbound code unchanged:

```ts
  const renewMedsMachineWithDeps = renewMedsMachine.provide(
    createActorServices(whatsapp, config.epsChatId),
  );
```

- [ ] **Step 4: Run orchestrator tests after implementation**

Run: `bun test src/__tests__/orchestrator.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit checkpoint only with approval**

If the user explicitly approved commits for this execution, run:

```bash
git add src/orchestrator.ts src/__tests__/orchestrator.test.ts
git commit -m "feat: listen to multiple EPS chat IDs"
```

Expected: commit succeeds. If commit approval was not given, skip this step and leave changes uncommitted.

---

### Task 4: Init Command And Presentation

**Files:**
- Modify: `src/cli/commands/init/command.ts`
- Modify: `src/cli/commands/init/presentation.ts`
- Modify: `src/__tests__/cli/commands/init/presentation.test.ts`

**Interfaces:**
- Consumes: `ValidatedConfig.epsChatIdsToListen: string`
- Produces: `showExistingConfig()` masks `epsChatIdsToListen`
- Produces: `showFieldHint("epsChatIdsToListen")` explains `|` separated listen IDs

- [ ] **Step 1: Write failing presentation tests**

Modify `FULL_CONFIG` in `src/__tests__/cli/commands/init/presentation.test.ts`:

```ts
const FULL_CONFIG: ValidatedConfig = {
  idType: "Cédula de ciudadanía",
  idNumber: "1234567890",
  birthdate: "01/01/1990",
  epsChatId: "573001234567@c.us",
  epsChatIdsToListen: "573001234567@c.us|147626817245299@lid",
  userToAlertChatId: "573007654321@c.us",
  successAlertMessage: "Renovación exitosa",
  nothingToRenewAlertMessage: "No hay nada por renovar",
  techAlertChatId: "573009999999@c.us",
};
```

Add a masking test in `describe("showExistingConfig", () => {`:

```ts
  it("should mask every epsChatIdsToListen entry", () => {
    const infoSpy = spyOn(consola, "info").mockImplementation(
      (() => {}) as never,
    );

    showExistingConfig(FULL_CONFIG);

    const allCalls = infoSpy.mock.calls.flat().join(" ");
    expect(allCalls).not.toContain("573001234567@c.us");
    expect(allCalls).not.toContain("147626817245299@lid");
    expect(allCalls).toContain("5730***4567@c.us");
    expect(allCalls).toContain("1476***5299@lid");
  });
```

Add a hint test in `describe("showFieldHint", () => {`:

```ts
  it("should print a hint for epsChatIdsToListen that mentions pipe-separated IDs", () => {
    const infoSpy = spyOn(consola, "info").mockImplementation(
      (() => {}) as never,
    );

    showFieldHint("epsChatIdsToListen");

    const output = infoSpy.mock.calls.flat().join(" ");
    expect(output).toContain("|");
    expect(output.toLowerCase()).toContain("escuchar");
  });
```

- [ ] **Step 2: Run presentation tests to verify they fail**

Run: `bun test src/__tests__/cli/commands/init/presentation.test.ts`

Expected: FAIL because `epsChatIdsToListen` preview and hint are not implemented.

- [ ] **Step 3: Update presentation helper**

Modify `src/cli/commands/init/presentation.ts` imports:

```ts
import { parsePipeSeparatedChatIds } from "../../../application/config/epsChatIds";
```

Add this helper near `isNonEmptyString`:

```ts
function maskPipeSeparatedChatIds(value: string): string {
  return parsePipeSeparatedChatIds(value).map(maskPhone).join(" | ");
}
```

Add preview output after `epsChatId`:

```ts
  if (isNonEmptyString(config.epsChatIdsToListen))
    consola.info(
      `Chat IDs de la EPS escuchados: ${maskPipeSeparatedChatIds(config.epsChatIdsToListen)}`,
    );
```

Add field hint:

```ts
  epsChatIdsToListen:
    "IDs de WhatsApp desde los que el bot aceptará respuestas de la EPS. Puedes separar varios con |, por ejemplo: 573001234567@c.us|147626817245299@lid. El bot seguirá enviando mensajes al Chat ID principal de la EPS.",
```

- [ ] **Step 4: Update init command prompt**

Modify `src/cli/commands/init/command.ts` after the `epsChatId` prompt:

```ts
    showFieldHint("epsChatIdsToListen");
    const epsChatIdsToListen = await promptText(
      "Chat IDs de la EPS a escuchar:",
      `${epsChatId}|XXXXXXXXXXXX@lid`,
    );
    if (!epsChatIdsToListen) return;
```

Add the new field to the `config` object:

```ts
      epsChatIdsToListen,
```

The final config object should contain both:

```ts
      epsChatId,
      epsChatIdsToListen,
```

- [ ] **Step 5: Run presentation tests**

Run: `bun test src/__tests__/cli/commands/init/presentation.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit checkpoint only with approval**

If the user explicitly approved commits for this execution, run:

```bash
git add src/cli/commands/init/command.ts src/cli/commands/init/presentation.ts src/__tests__/cli/commands/init/presentation.test.ts
git commit -m "feat: prompt EPS listen chat IDs"
```

Expected: commit succeeds. If commit approval was not given, skip this step and leave changes uncommitted.

---

### Task 5: Final Verification

**Files:**
- Modify: only files needed to fix verification failures from previous tasks

**Interfaces:**
- Consumes: all earlier task outputs
- Produces: passing project test/type/build verification

- [ ] **Step 1: Run all tests**

Run: `bun test`

Expected: PASS for the full test suite.

- [ ] **Step 2: Run TypeScript verification**

Run: `bunx tsc --noEmit`

Expected: PASS.

- [ ] **Step 3: Run package build**

Run: `bun run build`

Expected: PASS and produces `dist/cli.js` with the existing bundle script.

- [ ] **Step 4: Inspect working tree**

Run: `git status --short`

Expected: only intended files from this plan are modified or added.

- [ ] **Step 5: Commit final verification only with approval**

If the user explicitly approved commits for this execution and previous tasks were not committed, run:

```bash
git add .env.example src/application/config/types.ts src/application/config/epsChatIds.ts src/application/config/resolveConfig.ts src/orchestrator.ts src/cli/commands/init/command.ts src/cli/commands/init/presentation.ts src/__tests__/application/config/epsChatIds.test.ts src/__tests__/application/config/resolveConfig.test.ts src/__tests__/orchestrator.test.ts src/__tests__/cli/commands/init/presentation.test.ts docs/superpowers/specs/2026-07-08-eps-chat-ids-to-listen-design.md docs/superpowers/plans/2026-07-08-eps-chat-ids-to-listen.md
git commit -m "feat: add EPS listen chat ID allowlist"
```

Expected: commit succeeds. If commit approval was not given, skip this step and leave changes uncommitted.

---

## Self-Review Notes

- Spec coverage: the plan covers separate send/listen config, pipe parsing, fallback behavior, primary inclusion, fixed outbound chat, init UX, masked logs, env example, and tests.
- Placeholder scan: the plan contains concrete paths, commands, expected outputs, and code snippets for each implementation step.
- Type consistency: the config field is consistently named `epsChatIdsToListen`, the env var is consistently named `EPS_CHAT_IDS_TO_LISTEN`, and the parser signatures are consistent across tasks.
