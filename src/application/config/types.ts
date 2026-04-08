/**
 * Interfaz fuente de verdad para la configuración validada.
 * Todos los campos son strings requeridos.
 * Los tipos derivados (Partial, Omit) se usan en otros módulos.
 */
export interface ValidatedConfig {
  birthdate: string;
  epsChatId: string;
  idNumber: string;
  idType: string;
  nothingToRenewAlertMessage: string;
  successAlertMessage: string;
  techAlertChatId: string;
  userToAlertChatId: string;
}
