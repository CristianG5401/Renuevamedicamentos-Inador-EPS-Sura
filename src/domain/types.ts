import type { ListOption } from "../ports/whatsappPort";

export interface MessageFromEps {
  normalizedText: string;
  type: string;
  list: {
    description: string;
    sections: unknown[];
    options: ListOption[];
  };
  dynamicReplyButtons: {
    displayTexts: string[];
  };
}

export interface RenewMedsContext {
  messageFromEps: MessageFromEps;
  idType: string;
  idNumber: string;
  birthdate: string;
  userToAlertChatId: string;
  successAlertMessage: string;
  nothingToRenewAlertMessage: string;
}

export type RenewMedsInput = Omit<RenewMedsContext, "messageFromEps">;
