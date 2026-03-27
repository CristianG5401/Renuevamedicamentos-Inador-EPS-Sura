import { assign, fromPromise, setup } from "xstate";
import consola from "consola";

import { EVENTS, PROCEDURE_OPTIONS, STATES } from "./constants";
import { guards } from "./guards";
import type { MessageFromEps, RenewMedsContext, RenewMedsInput } from "./types";

export { EVENTS } from "./constants";

export const renewMedsMachine = setup({
  actors: {
    // Declaramos la "firma" del servicio, pero le ponemos un error por defecto
    // para que explote si olvidamos inyectarlo en producción.
    sendMessageService: fromPromise<
      string,
      { message: string; chatId?: string }
    >(async () => {
      throw new Error(
        "⚠️ ¡Olvidaste inyectar la dependencia 'sendMessageService'!",
      );
    }),
  },
  guards,
  types: {
    context: {} as RenewMedsContext,
    input: {} as RenewMedsInput,
    events: {} as
      | {
          type: typeof EVENTS.MESSAGE_RECEIVED;
          msg: MessageFromEps;
        }
      | {
          type: typeof EVENTS.WS_CLIENT_READY;
        },
  },
}).createMachine({
  context: ({ input }) => ({
    messageFromEps: {} as MessageFromEps,
    idType: input.idType,
    idNumber: input.idNumber,
    birthdate: input.birthdate,
    userToAlertChatId: input.userToAlertChatId,
    successAlertMessage: input.successAlertMessage,
    nothingToRenewAlertMessage: input.nothingToRenewAlertMessage,
  }),
  id: "renewMeds",
  initial: STATES.IDLE,
  states: {
    [STATES.IDLE]: {
      on: {
        [EVENTS.WS_CLIENT_READY]: STATES.WAKING_UP_EPS_BOT,
      },
    },
    [STATES.WAKING_UP_EPS_BOT]: {
      invoke: {
        id: "wakeUpEpsBot",
        src: "sendMessageService",
        input: {
          message: "Hola, necesito pedir mis medicamentos",
        },
        onDone: {
          target: STATES.WAITING.FOR_MAIN_MENU,
        },
        onError: {
          target: STATES.COMPLETED,
          actions: [
            ({ context, event }) => {
              consola.error("** 🐞 Error al despertar al bot de la EPS", {
                context,
                event,
              });
            },
          ],
        },
      },
    },
    [STATES.WAITING.FOR_MAIN_MENU]: {
      on: {
        MESSAGE_RECEIVED: [
          {
            target: STATES.SENDING.ACCEPT_TERMS_AND_CONDITIONS,
            guard: {
              type: "checkTermAndConditionsMenu",
              params: ({ event }) => ({ msg: event.msg }),
            },
            actions: assign({
              messageFromEps: ({ event }) => event.msg,
            }),
          },
          {
            target: STATES.WAITING.FOR_ID_TYPE_LIST,
            guard: {
              type: "checkAbsenceOfTermAndConditionsMenu",
              params: ({ event }) => ({ msg: event.msg }),
            },
            actions: assign({
              messageFromEps: ({ event }) => event.msg,
            }),
          },
          {
            target: STATES.COMPLETED,
            actions: [
              ({ event }) => {
                consola.warn(
                  "⚠️ WAITING_FOR_MAIN_MENU: el mensaje recibido no coincide con el patrón esperado",
                  { receivedText: event.msg.normalizedText },
                );
              },
            ],
          },
        ],
      },
    },
    [STATES.SENDING.ACCEPT_TERMS_AND_CONDITIONS]: {
      invoke: {
        id: "acceptTermsAndConditions",
        src: "sendMessageService",
        input: ({ context }) => ({
          message:
            context.messageFromEps.dynamicReplyButtons.displayTexts[0] ?? "", // Respondo con la opcion 'Acepto'
        }),
        onDone: {
          target: STATES.WAITING.FOR_ID_TYPE_LIST,
        },
        onError: {
          target: STATES.COMPLETED,
          actions: [
            ({ context, event }) => {
              consola.error(
                "** 🐞 Error al aceptar los terminos y condiciones",
                {
                  context,
                  event,
                },
              );
            },
          ],
        },
      },
    },
    [STATES.WAITING.FOR_ID_TYPE_LIST]: {
      on: {
        MESSAGE_RECEIVED: [
          {
            target: STATES.SENDING.ID_TYPE,
            guard: {
              type: "checkIdTypeList",
              params: ({ event }) => ({ msg: event.msg }),
            },
            actions: assign({
              messageFromEps: ({ event }) => event.msg,
            }),
          },
          {
            target: STATES.COMPLETED,
            actions: [
              ({ event }) => {
                consola.warn(
                  "⚠️ WAITING_FOR_ID_TYPE_LIST: el mensaje recibido no coincide con el patrón esperado",
                  { receivedText: event.msg?.list?.description },
                );
              },
            ],
          },
        ],
      },
    },
    [STATES.SENDING.ID_TYPE]: {
      invoke: {
        id: "sendIdType",
        src: "sendMessageService",
        input: ({ context }) => ({
          message: context.idType,
        }),
        onDone: {
          target: STATES.WAITING.FOR_ID_NUMBER_INPUT_MESSAGE,
        },
        onError: {
          target: STATES.COMPLETED,
          actions: [
            ({ context, event }) => {
              consola.error("** 🐞 Error al enviar el tipo de documento", {
                context,
                event,
              });
            },
          ],
        },
      },
    },
    [STATES.WAITING.FOR_ID_NUMBER_INPUT_MESSAGE]: {
      on: {
        MESSAGE_RECEIVED: [
          {
            target: STATES.SENDING.ID_NUMBER,
            guard: {
              type: "checkChatMessage",
              params: ({ event }) => ({
                msg: event.msg,
                expectedText:
                  "escribe el número de documento de identificación sin puntos, comas o cualquier otro carácter",
              }),
            },
            actions: assign({
              messageFromEps: ({ event }) => event.msg,
            }),
          },
          {
            target: STATES.COMPLETED,
            actions: [
              ({ event }) => {
                consola.warn(
                  "⚠️ WAITING_FOR_ID_NUMBER_INPUT_MESSAGE: el mensaje recibido no coincide con el patrón esperado",
                  { receivedText: event.msg.normalizedText },
                );
              },
            ],
          },
        ],
      },
    },
    [STATES.SENDING.ID_NUMBER]: {
      invoke: {
        id: "sendIdNumber",
        src: "sendMessageService",
        input: ({ context }) => ({
          message: context.idNumber,
        }),
        onDone: {
          target: STATES.WAITING.FOR_EPS_SERVICES_LIST,
        },
        onError: {
          target: STATES.COMPLETED,
          actions: [
            ({ context, event }) => {
              consola.error("** 🐞 Error al enviar el numero de documento", {
                context,
                event,
              });
            },
          ],
        },
      },
    },
    [STATES.WAITING.FOR_EPS_SERVICES_LIST]: {
      on: {
        MESSAGE_RECEIVED: [
          {
            target: STATES.SENDING.SELECTED_EPS_SERVICE,
            guard: {
              type: "checkEpsServicesList",
              params: ({ event }) => ({ msg: event.msg }),
            },
            actions: assign({
              messageFromEps: ({ event }) => event.msg,
            }),
          },
          {
            target: STATES.COMPLETED,
            actions: [
              ({ event }) => {
                consola.warn(
                  "⚠️ WAITING_FOR_EPS_SERVICES_LIST: el mensaje recibido no coincide con el patrón esperado",
                  { receivedText: event.msg?.list?.description },
                );
              },
            ],
          },
        ],
      },
    },
    [STATES.SENDING.SELECTED_EPS_SERVICE]: {
      invoke: {
        id: "sendSelectedEpsService",
        src: "sendMessageService",
        input: {
          message: "Trámites y Medicamentos",
        },
        onDone: {
          target: STATES.WAITING.FOR_PROCS_AND_MEDS_MENU,
        },
        onError: {
          target: STATES.COMPLETED,
          actions: [
            ({ context, event }) => {
              consola.error("** 🐞 Error al enviar el servicio seleccionado", {
                context,
                event,
              });
            },
          ],
        },
      },
    },
    [STATES.WAITING.FOR_PROCS_AND_MEDS_MENU]: {
      on: {
        MESSAGE_RECEIVED: [
          {
            target: STATES.SENDING.SELECTED_PROCS_AND_MEDS_OPTION,
            guard: {
              type: "checkProcsAndMedsMenu",
              params: ({ event }) => ({ msg: event.msg }),
            },
            actions: assign({
              messageFromEps: ({ event }) => event.msg,
            }),
          },
          {
            target: STATES.COMPLETED,
            actions: [
              ({ event }) => {
                consola.warn(
                  "⚠️ WAITING_FOR_PROCS_AND_MEDS_MENU: el mensaje recibido no coincide con el patrón esperado",
                  { receivedText: event.msg?.normalizedText },
                );
              },
            ],
          },
        ],
      },
    },
    [STATES.SENDING.SELECTED_PROCS_AND_MEDS_OPTION]: {
      invoke: {
        id: "sendSelectedProcsAndMedsOption",
        src: "sendMessageService",
        input: {
          message: "Trámites",
        },
        onDone: {
          target: STATES.WAITING.FOR_PROCEDURES_MESSAGE,
        },
        onError: {
          target: STATES.COMPLETED,
          actions: [
            ({ context, event }) => {
              consola.error(
                "** 🐞 Error al enviar la opción de trámites y medicamentos",
                {
                  context,
                  event,
                },
              );
            },
          ],
        },
      },
    },
    [STATES.WAITING.FOR_PROCEDURES_MESSAGE]: {
      on: {
        MESSAGE_RECEIVED: [
          {
            target: STATES.SENDING.SELECTED_PROCEDURE_OPTION,
            guard: {
              type: "checkChatMessage",
              params: ({ event }) => ({
                msg: event.msg,
                expectedText: "renovación mensual formula de medicamentos",
              }),
            },
            actions: assign({
              messageFromEps: ({ event }) => event.msg,
            }),
          },
          {
            target: STATES.COMPLETED,
            actions: [
              ({ event }) => {
                consola.warn(
                  "⚠️ WAITING_FOR_PROCEDURES_MESSAGE: el mensaje recibido no coincide con el patrón esperado",
                  { receivedText: event.msg?.normalizedText },
                );
              },
            ],
          },
        ],
      },
    },
    [STATES.SENDING.SELECTED_PROCEDURE_OPTION]: {
      invoke: {
        id: "sendSelectedProcedureOption",
        src: "sendMessageService",
        input: {
          message: PROCEDURE_OPTIONS.RENEW_MEDS,
        },
        onDone: {
          target: STATES.WAITING.FOR_ACTIVE_PRESCRIPTION_WARNING,
        },
        onError: {
          target: STATES.COMPLETED,
          actions: [
            ({ context, event }) => {
              consola.error(
                "** 🐞 Error al enviar la opción de procedimiento",
                {
                  context,
                  event,
                },
              );
            },
          ],
        },
      },
    },
    [STATES.WAITING.FOR_ACTIVE_PRESCRIPTION_WARNING]: {
      on: {
        MESSAGE_RECEIVED: [
          {
            target: STATES.WAITING.FOR_BIRTHDATE_INPUT_MESSAGE,
            guard: {
              type: "checkChatMessage",
              params: ({ event }) => ({
                msg: event.msg,
                expectedText:
                  "si tienes una fórmula vigente para varios meses y ya te correponde la fecha de entrega", // El typo 'correponde' es un error tipográfico que envia la eps
              }),
            },
          },
          {
            target: STATES.COMPLETED,
            actions: [
              ({ event }) => {
                consola.warn(
                  "⚠️ WAITING_FOR_ACTIVE_PRESCRIPTION_WARNING: el mensaje recibido no coincide con el patrón esperado",
                  { receivedText: event.msg?.normalizedText },
                );
              },
            ],
          },
        ],
      },
    },
    [STATES.WAITING.FOR_BIRTHDATE_INPUT_MESSAGE]: {
      on: {
        MESSAGE_RECEIVED: [
          {
            target: STATES.SENDING.BIRTHDATE,
            guard: {
              type: "checkChatMessage",
              params: ({ event }) => ({
                msg: event.msg,
                expectedText: "¿cuál es tu fecha de nacimiento?",
              }),
            },
            actions: assign({
              messageFromEps: ({ event }) => event.msg,
            }),
          },
          {
            target: STATES.COMPLETED,
            actions: [
              ({ event }) => {
                consola.warn(
                  "⚠️ WAITING_FOR_BIRTHDATE_INPUT_MESSAGE: el mensaje recibido no coincide con el patrón esperado",
                  { receivedText: event.msg?.normalizedText },
                );
              },
            ],
          },
        ],
      },
    },
    [STATES.SENDING.BIRTHDATE]: {
      invoke: {
        src: "sendMessageService",
        input: ({ context }) => ({
          message: context.birthdate,
        }),
        onDone: {
          target: STATES.WAITING.FOR_CONFIRMATION_OF_PRESCRIPTION_RENEWAL,
        },
        onError: {
          target: STATES.COMPLETED,
          actions: [
            ({ context, event }) => {
              consola.error("** 🐞 Error al enviar la fecha de nacimiento", {
                context,
                event,
              });
            },
          ],
        },
      },
    },
    [STATES.WAITING.FOR_CONFIRMATION_OF_PRESCRIPTION_RENEWAL]: {
      on: {
        MESSAGE_RECEIVED: [
          {
            target: STATES.WAITING.FOR_PRESCRIPTION_RENEWAL_SUCCESS,
            guard: {
              type: "checkChatMessage",
              params: ({ event }) => ({
                msg: event.msg,
                expectedText:
                  "hemos recibido la solicitud para renovar la fórmula de tus medicamentos.",
              }),
            },
          },
          {
            target: STATES.COMPLETED,
            actions: [
              ({ event }) => {
                consola.warn(
                  "⚠️ WAITING_FOR_CONFIRMATION_OF_PRESCRIPTION_RENEWAL: el mensaje recibido no coincide con el patrón esperado",
                  { receivedText: event.msg?.normalizedText },
                );
              },
            ],
          },
        ],
      },
    },
    [STATES.WAITING.FOR_PRESCRIPTION_RENEWAL_SUCCESS]: {
      on: {
        MESSAGE_RECEIVED: [
          {
            target: STATES.SENDING.SUCCESS_MESSAGE_ALERT,
            guard: {
              type: "checkChatMessage",
              params: ({ event }) => ({
                msg: event.msg,
                expectedText: "se renovaron exitosamente tus medicamentos.",
              }),
            },
          },
          {
            target: STATES.SENDING.NOTHING_TO_RENEW_MESSAGE,
            guard: {
              type: "checkChatMessage",
              params: ({ event }) => ({
                msg: event.msg,
                expectedText:
                  "identificamos que aún no es la fecha de renovación de tus medicamentos",
              }),
            },
          },
          {
            target: STATES.COMPLETED,
            actions: [
              ({ event }) => {
                throw new Error(
                  "🐞 WAITING_FOR_PRESCRIPTION_RENEWAL_SUCCESS: El mensaje recibido no coincide con el patrón esperado",
                  {
                    cause: event.msg,
                  },
                );
              },
            ],
          },
        ],
      },
    },
    [STATES.SENDING.SUCCESS_MESSAGE_ALERT]: {
      invoke: {
        src: "sendMessageService",
        input: ({ context }) => ({
          message: context.successAlertMessage,
          chatId: context.userToAlertChatId,
        }),
        onDone: {
          target: STATES.COMPLETED,
        },
        onError: {
          target: STATES.COMPLETED,
          actions: [
            ({ context, event }) => {
              consola.error("** 🐞 Error al enviar el mensaje de alerta **", {
                context,
                event,
              });
            },
          ],
        },
      },
    },
    [STATES.SENDING.NOTHING_TO_RENEW_MESSAGE]: {
      invoke: {
        src: "sendMessageService",
        input: ({ context }) => ({
          message: context.nothingToRenewAlertMessage,
          chatId: context.userToAlertChatId,
        }),
        onDone: {
          target: STATES.COMPLETED,
        },
        onError: {
          target: STATES.COMPLETED,
          actions: [
            ({ context, event }) => {
              consola.error(
                "** 🐞 Error al enviar el mensaje de nada que renovar **",
                {
                  context,
                  event,
                },
              );
            },
          ],
        },
      },
    },
    [STATES.COMPLETED]: {
      type: "final",
    },
  },
});
