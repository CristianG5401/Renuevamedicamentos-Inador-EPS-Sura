export function parsePipeSeparatedChatIds(value: string | undefined): string[] {
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
