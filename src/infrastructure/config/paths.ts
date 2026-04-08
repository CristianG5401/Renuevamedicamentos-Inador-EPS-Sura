/**
 * Resolución de rutas XDG para el archivo de configuración global.
 * Respeta $XDG_CONFIG_HOME (por defecto ~/.config/).
 *
 * Funciones (no constantes) para que $XDG_CONFIG_HOME se lea al momento de la llamada — testeable.
 */

import { join } from "node:path";
import { homedir } from "node:os";
import pkg from "../../../package.json";

/** Extrae el nombre del binario de package.json o lanza error si no existe. */
function resolveBinName(): string {
  const name = Object.keys(pkg.bin).at(0);

  if (!name) {
    throw new Error("No se encontró ninguna entrada en 'bin' en package.json");
  }

  return name;
}

const APP_NAME = resolveBinName();
const CONFIG_FILENAME = "config.json";

/** Resuelve el directorio de configuración XDG para esta app. */
export function getConfigDir(): string {
  const xdgBase = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");

  return join(xdgBase, APP_NAME);
}

/** Resuelve la ruta completa al archivo global config.json. */
export function getConfigFilePath(): string {
  return join(getConfigDir(), CONFIG_FILENAME);
}
