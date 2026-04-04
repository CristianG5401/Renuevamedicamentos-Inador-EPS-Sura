/**
 * Módulo de resolución de configuración.
 * Valida la config requerida al inicio (fail-fast),
 * mezclando valores de argumentos CLI, variables de entorno y config.json global.
 *
 * Prioridad: CLI args (mayor) → process.env (.env en cwd) → config.json (XDG global) → error.
 */

import { loadGlobalConfig } from "./global-store";
import type { ValidatedConfig } from "./types";

export type { ValidatedConfig } from "./types";

/** Valores sobreescribibles desde argumentos CLI (datos del usuario). */
export type CliOverrides = Partial<Omit<ValidatedConfig, "epsChatId">>;

/**
 * Resuelve la configuración final mezclando argumentos CLI, variables de entorno y config.json global.
 * Prioridad: CLI args (mayor) → process.env → config.json → error si falta.
 * NOTA: epsChatId solo viene de process.env o config.json (nunca de CLI args).
 * @param overrides - Valores opcionales del CLI que sobreescriben .env y config.json
 * @returns Configuración validada con todos los campos presentes
 */
export async function resolveConfig(
	overrides?: CliOverrides,
): Promise<ValidatedConfig> {
	const globalConfig: Partial<ValidatedConfig> = (await loadGlobalConfig()) ?? {};

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
		epsChatId: process.env.EPS_CHAT_ID ?? globalConfig.epsChatId,
	};

	const missingVars = Object.entries(resolved)
		.filter(([, value]) => !value)
		.map(([key]) => key);

	if (missingVars.length > 0) {
		throw new Error(
			`Faltan variables de configuración requeridas: ${missingVars.join(", ")}.\n` +
				"Ejecuta `renuevamedicamentos-inador init` para crear el archivo de configuración,\n" +
				"o crea un archivo .env basado en .env.example, o pasa los valores como argumentos CLI.",
		);
	}

	return resolved as ValidatedConfig;
}
