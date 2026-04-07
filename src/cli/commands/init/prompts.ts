/**
 * Wrappers de prompts para el comando `init`.
 *
 * Este archivo agrupa helpers alrededor de `consola.prompt` para mantener
 * uniforme la interacción con la CLI y centralizar detalles repetidos como
 * el manejo de cancelación por parte del usuario.
 */

import consola from "consola";

/**
 * Solicita un valor de texto al usuario, retornando undefined si cancela (Ctrl+C).
 * Centraliza el patrón de chequeo de cancelación para evitar repetición.
 */
export async function promptText(
  message: string,
  placeholder?: string,
): Promise<string | undefined> {
  const result = await consola.prompt(message, {
    type: "text",
    placeholder,
  });

  if (typeof result === "symbol") return undefined;

  return result;
}
