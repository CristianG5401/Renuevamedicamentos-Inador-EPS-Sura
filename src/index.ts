import qrcode from "qrcode-terminal";
import { Client, LocalAuth } from "whatsapp-web.js";
import { createActor, fromPromise } from "xstate";

// Configuración
import { ENV, maskPhone } from "./config";
// Máquina de estados
import { EVENTS, renewMedsMachine } from "./renewMedsMachine";
// Types
import type { ListOption, MessageFromEps } from "./types";

// Utilidad para simular el tiempo de tecleo
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Usamos LocalAuth para no tener que escanear el QR cada vez que corras el script
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true, // Mantén esto en false si quieres ver el navegador abriéndose para depurar
  },
});

// --- INYECCIÓN DE DEPENDENCIAS 💉 ---
// Sobrescribimos la máquina original pasándole la implementación real

// TODO: Mover esto a un archivo aparte, servicios tal vez ?
const renewMedsMachineWithDeps = renewMedsMachine.provide({
  actors: {
    // Definimos qué hace 'sendMessageService' realmente
    sendMessageService: fromPromise(
      async ({ input }: { input: { message: string; chatId?: string } }) => {
        const { message, chatId = ENV.EPS_CHAT_ID } = input;

        await delay(2000); // Simula el tiempo de tecleo

        const sentMessage = await client.sendMessage(chatId, message);

        if (!sentMessage || !sentMessage.id?.id) {
          throw new Error("No se pudo enviar el mensaje", {
            cause: sentMessage,
          });
        }
        console.log("** 📬 Mensaje enviado **", {
          messageId: sentMessage.id,
          message,
        });

        await delay(2000); // Simula el tiempo de tecleo

        return sentMessage.id;
      },
    ),
  },
});

// 1. Crear el Actor (el robot que ejecutará las instrucciones)
const actor = createActor(renewMedsMachineWithDeps, {
  input: {
    idType: ENV.ID_TYPE,
    idNumber: ENV.ID_NUMBER,
    birthdate: ENV.BIRTHDATE,
    userToAlertChatId: ENV.USER_TO_ALERT_CHAT_ID,
    successAlertMessage: ENV.SUCCESS_ALERT_MESSAGE,
    nothingToRenewAlertMessage: ENV.NOTHING_TO_RENEW_ALERT_MESSAGE,
  },
});

// 2. Suscribirse a los cambios (tu console.log automático)

// TODO: Mejorar toda esta logica de los logs, buscar alguna mejor y mas estandar alternativa, algo lindo que se paresca a una cli o a una tui
actor.subscribe({
  next(snapshot) {
    console.log("--------------------------------------------------");
    console.log(`\nEstado: [${snapshot.value}]`);
    console.log(`Contexto:`, snapshot.context); // TODO: Remover este log en producción/uso real
    console.log(`Chat EPS: ${maskPhone(ENV.EPS_CHAT_ID)}`);
    console.log("--------------------------------------------------\n");
  },
  async complete() {
    console.log("Máquina finalizada, cerrando cliente de WhatsApp...");
    await client.destroy();
    console.log("Cliente de WhatsApp cerrado");
    console.log("Saliendo del programa...");
    process.exit(0);
  },
  async error(error) {
    console.log("--------------------------------------------------");
    console.log(
      "Máquina finalizada, con errores, enviando alerta por WS a usuario encargado...",
    );
    await client.sendMessage(
      ENV.TECH_ALERT_CHAT_ID,
      `El bot de la EPS falló, por favor revisa el log para más información: ${error}`,
    );
    console.error("** 🐞 Error en la máquina de estados **", error);
    await client.destroy();
    console.log("Cliente de WhatsApp cerrado");
    console.log("Saliendo del programa...");
    console.log("--------------------------------------------------\n");
    throw error; // Lanzamos el error para que el proceso termine
  },
});

// 3. Encender el Actor
actor.start();

client.on("qr", (qr) => {
  // Esto imprimirá el QR en tu terminal
  qrcode.generate(qr, { small: true });
  console.log("Escanea el código QR con tu WhatsApp");
});

client.on("ready", () => {
  console.log("¡Cliente de WhatsApp listo y conectado!");

  actor.send({ type: EVENTS.WS_CLIENT_READY });
});

// TODO: Mejorar toda la logica el parseo de mensajes
client.on("message", async (msg) => {
  // Ignorar mensajes que no sean del bot de la EPS
  if (msg.from !== ENV.EPS_CHAT_ID) return;

  const rawData = msg.rawData as unknown as {
    list: {
      body: string;
      buttonText: string;
      description: string;
      sections: {
        rows: ListOption[];
      }[];
    };
    dynamicReplyButtons: {
      buttonId: string;
      buttonText: {
        displayText: string;
      };
      type: number;
    }[];
  };

  const parsedMessage: MessageFromEps = {
    normalizedText: msg.body.toLowerCase(),
    type: msg.type,
    list: {
      description: rawData?.list?.description,
      sections: rawData?.list?.sections,
      options: rawData?.list?.sections.flatMap((section) => section.rows),
    },
    dynamicReplyButtons: {
      displayTexts: rawData?.dynamicReplyButtons?.map(
        (button) => button.buttonText.displayText,
      ),
    },
  };

  actor.send({ type: EVENTS.MESSAGE_RECEIVED, msg: parsedMessage });
});

client.initialize();
