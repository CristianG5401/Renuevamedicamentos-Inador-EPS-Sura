import consola from "consola";
import type { MessageFromEps, RenewMedsContext } from "./types";

/**
 * Guards para la máquina de estados de renovación de medicamentos.
 * Cada guard valida un mensaje recibido del bot de la EPS
 * para determinar si coincide con el paso esperado del flujo.
 */
export const guards = {
  checkTermAndConditionsMenu: (
    _: { context: RenewMedsContext },
    { msg }: { msg: MessageFromEps },
  ) => {
    consola.debug("**🪼 checkTermAndConditionsMenu **", {
      msg,
    });
    if (!msg.dynamicReplyButtons?.displayTexts) return false;

    const isTermAndConditionsMenuAvailable = msg.normalizedText.includes(
      "te damos la bienvenida a la línea de whatsapp de eps sura",
    );
    const areMenuOptionAvailable =
      msg.dynamicReplyButtons?.displayTexts.length > 0;
    const isFirstOptionCorrectOne =
      msg.dynamicReplyButtons?.displayTexts[0] === "Acepto";

    return (
      isTermAndConditionsMenuAvailable &&
      areMenuOptionAvailable &&
      isFirstOptionCorrectOne
    );
  },
  checkAbsenceOfTermAndConditionsMenu: (
    _: unknown,
    { msg }: { msg: MessageFromEps },
  ) => {
    consola.debug("**🪼 checkAbsenceOfTermAndConditionsMenu **", {
      msg,
    });
    const isTermAndConditionsAlternativeMessage = msg.normalizedText.includes(
      "te damos la bienvenida. gracias por ponerte en contacto con nosotros.",
    );
    const areMenuOptionNotAvailable =
      !msg.dynamicReplyButtons?.displayTexts ||
      msg.dynamicReplyButtons?.displayTexts.length === 0;

    return isTermAndConditionsAlternativeMessage && areMenuOptionNotAvailable;
  },
  checkIdTypeList: (
    { context }: { context: RenewMedsContext },
    { msg }: { msg: MessageFromEps },
  ) => {
    consola.debug("**🪼 checkIdTypeList **", {
      msg,
    });
    if (msg.type !== "list") return false;

    const isIdTypeListDescriptionOK = msg?.list?.description.includes(
      "Selecciona el tipo de documento del usuario que necesita el servicio",
    );

    const listOptionsAreAvailable = msg?.list?.options?.length > 0;
    const matchingIdTypeOption = msg?.list?.options?.find((option) => {
      return option.title === context.idType;
    });

    return (
      isIdTypeListDescriptionOK &&
      listOptionsAreAvailable &&
      !!matchingIdTypeOption
    );
  },
  checkChatMessage: (
    _: { context: RenewMedsContext },
    { msg, expectedText }: { msg: MessageFromEps; expectedText: string },
  ) => {
    consola.debug("**🪼 checkChatMessage **", { msg, expectedText });
    if (msg.type !== "chat") return false;
    return msg?.normalizedText?.includes(expectedText);
  },
  checkEpsServicesList: (
    _: { context: RenewMedsContext },
    { msg }: { msg: MessageFromEps },
  ) => {
    consola.debug("**🪼 checkEpsServicesList **", {
      msg,
    });
    if (msg.type !== "list") return false;

    const isEpsServicesListDescriptionOK = msg?.list?.description.includes(
      "selecciona la opción que necesitas",
    );

    const listOptionsAreAvailable = msg?.list?.options?.length > 0;
    const matchingEpsServiceOption = msg?.list?.options?.find((option) => {
      return option.title === "Trámites y Medicamentos";
    });

    return (
      isEpsServicesListDescriptionOK &&
      listOptionsAreAvailable &&
      !!matchingEpsServiceOption
    );
  },
  checkProcsAndMedsMenu: (
    _: { context: RenewMedsContext },
    { msg }: { msg: MessageFromEps },
  ) => {
    consola.debug("**🪼 checkProcsAndMedsMenu **", {
      msg,
    });
    if (!msg.dynamicReplyButtons?.displayTexts) return false;

    const isProcsAndMedsMenuDescriptionOK =
      msg.normalizedText?.includes("elige la opción:");

    const areMenuOptionAvailable =
      msg.dynamicReplyButtons?.displayTexts.length > 0;
    const matchingProcsAndMedsOption =
      msg.dynamicReplyButtons?.displayTexts?.find((option) => {
        return option === "Trámites";
      });

    return (
      isProcsAndMedsMenuDescriptionOK &&
      areMenuOptionAvailable &&
      !!matchingProcsAndMedsOption
    );
  },
};
