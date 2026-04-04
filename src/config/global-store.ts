/**
 * Operaciones de lectura/escritura para el archivo global config.json.
 * Usa Bun.file() para lectura y Bun.write() para escritura.
 */

import { mkdir } from "node:fs/promises";
import type { ValidatedConfig } from "./types";
import { getConfigDir, getConfigFilePath } from "./paths";

/**
 * Carga el config.json global, retornando null si no existe o no se puede leer.
 */
export async function loadGlobalConfig(): Promise<Partial<ValidatedConfig> | null> {
  try {
    return await Bun.file(getConfigFilePath()).json() as Partial<ValidatedConfig>;
  } catch {
    return null;
  }
}

/**
 * Escribe un objeto de configuración parcial al archivo config.json en la ruta XDG.
 * Crea los directorios intermedios si es necesario.
 * @returns La ruta absoluta donde se escribió la configuración
 */
export async function writeGlobalConfig(config: Partial<ValidatedConfig>): Promise<string> {
  const configDir = getConfigDir();
  const configPath = getConfigFilePath();

  await mkdir(configDir, { recursive: true });
  await Bun.write(configPath, `${JSON.stringify(config, null, 2)}\n`);

  return configPath;
}
