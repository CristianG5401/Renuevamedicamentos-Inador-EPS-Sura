# EPS Chat IDs To Listen

## Problem

The bot currently has a single `epsChatId` value. That value is used for two
different responsibilities:

- The outbound chat where the bot sends messages to start and continue the EPS
  renewal flow.
- The inbound filter that decides whether a WhatsApp message belongs to the EPS
  conversation.

Some EPS conversations may arrive from more than one WhatsApp ID, for example a
regular contact ID and a `@lid` ID. The bot should be able to accept messages
from several known EPS IDs without broadcasting outbound messages to all of
them.

## Design Decisions

### Separate Send Target From Listen Allowlist

Keep `EPS_CHAT_ID` / `epsChatId` as the single outbound destination. Add a new
configuration value, `EPS_CHAT_IDS_TO_LISTEN` / `epsChatIdsToListen`, for the
inbound allowlist.

This keeps the configuration explicit:

- `EPS_CHAT_ID` answers: where does the bot send messages?
- `EPS_CHAT_IDS_TO_LISTEN` answers: from which chats does the bot accept EPS
  responses?

### Pipe-Separated Config Value

`EPS_CHAT_IDS_TO_LISTEN` uses a pipe-separated string:

```txt
573175180237@c.us|147626817245299@lid
```

This format is easy to set in `.env`, shell environments, and JSON config while
avoiding a broader migration to arrays in the global config file.

### Backward-Compatible Default

If `EPS_CHAT_IDS_TO_LISTEN` is not configured, it falls back to `EPS_CHAT_ID`.
Existing users with a single EPS chat keep the same behavior.

If `EPS_CHAT_IDS_TO_LISTEN` is configured but does not include `EPS_CHAT_ID`, the
runtime listen allowlist still includes `EPS_CHAT_ID`. This prevents accidental
misconfiguration where the bot sends to the primary EPS chat but ignores replies
from that same chat.

### Fixed Outbound Chat

The bot always sends EPS flow messages to `epsChatId`, even if a valid inbound
message arrives from another ID in the listen allowlist. It does not switch the
active outbound chat during a run.

This avoids duplicate or drifting conversations and matches the desired behavior:
listen broadly, send narrowly.

## Components

### Config Type

`ValidatedConfig` gains a required string field:

```ts
epsChatIdsToListen: string;
```

The field is required in the resolved runtime config, but it can be omitted by
the user because `resolveConfig` derives it from `epsChatId` when missing.

### Config Resolution

`resolveConfig` resolves the new value with this precedence:

```txt
process.env.EPS_CHAT_IDS_TO_LISTEN -> globalConfig.epsChatIdsToListen -> epsChatId
```

`epsChatId` remains excluded from CLI overrides, and the new listen field should
also remain outside CLI overrides unless the CLI already exposes a dedicated
configuration path for it.

### Listen Allowlist Parser

Add a small parser/helper that turns the configured string into a normalized
array:

- Split on `|`.
- Trim surrounding whitespace.
- Ignore empty segments.
- Deduplicate IDs while preserving order.
- Always include `epsChatId` in the final result.
- Surface a configuration error only if no listen IDs can be produced because
  `epsChatId` is also missing.

The parser should be tested independently because it encodes the configuration
contract.

### Orchestrator

`startRenewal` keeps using `config.epsChatId` for outbound messages:

```ts
createActorServices(whatsapp, config.epsChatId)
```

The inbound filter changes from a single equality check to allowlist membership:

```ts
if (!epsChatIdsToListen.includes(msg.from)) return;
```

The actor still receives parsed EPS messages the same way as before. No state
machine changes are required.

### Init Command And Presentation

The interactive `init` command prompts for the new listen allowlist after asking
for `epsChatId`. The prompt should explain that the user may enter one or more
IDs separated by `|` and that the outbound chat remains `epsChatId`.

Existing config preview should display `epsChatIdsToListen` with each ID masked.
The output should avoid leaking full chat IDs.

### Logging

Observer logs should distinguish the send target and listen allowlist. For
example:

```txt
Chat EPS destino: 5731***0237@c.us
Chats EPS escuchados: 5731***0237@c.us, 1476***5299@lid
```

## Error Handling

Malformed values are handled conservatively:

- Empty chunks caused by `||` are ignored.
- Whitespace-only chunks are ignored.
- Duplicate IDs are ignored after the first occurrence.
- A completely empty listen value falls back to `epsChatId` if available.
- If neither `epsChatId` nor any listen ID is available, startup fails with the
  existing missing configuration error path.

The implementation does not validate WhatsApp ID shape beyond non-empty strings,
matching the current behavior for `epsChatId`.

## Testing

Add or update tests for:

- Config resolution uses `EPS_CHAT_IDS_TO_LISTEN` when present.
- Config resolution falls back to `epsChatId` when the new value is absent.
- The parser trims, ignores empty chunks, deduplicates, and appends the primary
  EPS chat when omitted.
- The orchestrator accepts inbound messages from any listen ID.
- The orchestrator ignores inbound messages outside the listen allowlist.
- The actor services still send default messages to `epsChatId`.
- Init presentation masks every ID in `epsChatIdsToListen`.

## Out Of Scope

- Broadcasting the same outbound message to several EPS chats.
- Switching the outbound destination to the first responding chat.
- Retrying the renewal flow against alternate EPS chats after timeout or failure.
- Migrating global config from strings to arrays.
