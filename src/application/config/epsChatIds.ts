/**
 * Convierte una lista de Chat IDs separada por pipes (`|`) en un arreglo limpio.
 *
 * Ejemplos:
 * - Input: `573175180237@c.us|147626817245299@lid`
 *   Output: `["573175180237@c.us", "147626817245299@lid"]`
 * - Input: ` 573175180237@c.us | | 147626817245299@lid `
 *   Output: `["573175180237@c.us", "147626817245299@lid"]`
 * - Input: `573175180237@c.us|573175180237@c.us`
 *   Output: `["573175180237@c.us"]`
 *
 * La función no valida el formato de WhatsApp; solo normaliza strings no vacíos,
 * igual que el resto de la configuración actual del bot.
 */
export function parsePipeSeparatedChatIds(value: string | undefined): string[] {
  if (!value) return [];

  const uniqueChatIds: string[] = [];
  const seen = new Set<string>();

  for (const rawChunk of value.split("|")) {
    const chatId = rawChunk.trim();

    // Ignora valores vacíos (`||`, espacios) y repeticiones sin cambiar el orden.
    if (!chatId || seen.has(chatId)) continue;

    seen.add(chatId);
    uniqueChatIds.push(chatId);
  }

  return uniqueChatIds;
}

/**
 * Construye la allowlist final de chats desde los que aceptamos respuestas EPS.
 *
 * `epsChatId` sigue siendo el destino primario de envío. Aunque el usuario
 * configure una lista de escucha aparte, siempre agregamos el primario para
 * evitar una configuración accidental donde el bot envía a un chat pero ignora
 * las respuestas de ese mismo chat.
 *
 * Ejemplos:
 * - Input: `epsChatId = "573175180237@c.us"`, `rawListenValue = undefined`
 *   Output: `["573175180237@c.us"]`
 * - Input: `epsChatId = "573175180237@c.us"`, `rawListenValue = "147626817245299@lid"`
 *   Output: `["147626817245299@lid", "573175180237@c.us"]`
 * - Input: `epsChatId = "573175180237@c.us"`, `rawListenValue = "573175180237@c.us|147626817245299@lid"`
 *   Output: `["573175180237@c.us", "147626817245299@lid"]`
 */
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
