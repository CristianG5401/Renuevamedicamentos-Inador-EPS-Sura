# Init Welcome & Guided Onboarding

## Problem

The `init` command jumps straight into prompts without context. New users don't
know what the tool does, what data will be collected, or where the config file
will be saved. The TODO at `src/commands/init.ts:27-29` requests a welcome
message and XDG path explanation before the prompts begin.

## Design decisions

### Tone: Guided/onboarding

Each field gets an inline explanation right before its prompt. Non-obvious fields
(WhatsApp Chat IDs) include instructions on how to find the value.

### Visual style: Styled header + plain body

- `consola.box()` for the tool name/title (polished first impression).
- `consola.info()` for explanatory text (readable, not noisy).

### Existing config: Show masked values before overwrite

When a config already exists, display current values with sensitive fields masked
(`maskIdNumber`, `maskPhone`) before asking the overwrite confirmation.

### File structure: Presentation helpers in subfolder

```
src/commands/
  init.ts                       # Flow orchestrator (existing)
  init/
    presentation.ts             # Banner, inline hints, config preview
```

`src/commands/` stays reserved for command definitions. The `init/` subfolder
groups helpers specific to the init command.

## Components

### 1. Welcome banner (`showWelcomeBanner`)

Shown once at the top of `run()`, before any prompt.

- `consola.box()` with tool name and one-liner description.
- `consola.info()` lines explaining:
  - What the command does (creates/updates global config).
  - Where the file will be saved (resolved XDG path).
  - That personal data will be asked.

### 2. Inline field hints (`showFieldHint`)

Called before each prompt that needs explanation. A map from field name to hint
text. Self-explanatory fields (idType, idNumber) get minimal or no hint.

| Field                      | Hint content                                        |
| -------------------------- | --------------------------------------------------- |
| `idType`                   | (none — select list is self-explanatory)             |
| `idNumber`                 | (none — self-explanatory)                            |
| `birthdate`                | Format reminder: DD/MM/AAAA                         |
| `epsChatId`                | What it is + how to find it in WhatsApp Web          |
| `userToAlertChatId`        | Where success/no-renew alerts go + how to find it    |
| `successAlertMessage`      | Sent when renewal completes successfully             |
| `nothingToRenewAlertMessage` | Sent when there's nothing to renew                 |
| `techAlertChatId`          | Where technical errors go + how to find it           |

### 3. Existing config preview (`showExistingConfig`)

When `loadGlobalConfig()` returns a non-null value:

- Display each field using `consola.info()`.
- Mask `idNumber` with `maskIdNumber()`.
- Mask `epsChatId`, `userToAlertChatId`, `techAlertChatId` with `maskPhone()`.
- Then show the existing overwrite confirmation prompt.

### 4. Changes to `init.ts`

- Import presentation functions from `./init/presentation`.
- Call `showWelcomeBanner()` at the top of `run()`.
- Call `showExistingConfig(config)` before the overwrite prompt.
- Call `showFieldHint("fieldName")` before each prompt that needs one.
- Remove the TODO comment.
