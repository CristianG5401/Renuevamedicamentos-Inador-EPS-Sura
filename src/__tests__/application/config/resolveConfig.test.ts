import { afterEach, describe, expect, it, mock } from "bun:test";
import type { CliOverrides } from "../../../application/config/resolveConfig";

const cliOverridesCannotSetListenIds: CliOverrides = {
  // @ts-expect-error listen IDs are resolved from env/global config only.
  epsChatIdsToListen: "573175180237@c.us",
};
void cliOverridesCannotSetListenIds;

const BASE_GLOBAL_CONFIG = {
  birthdate: "01/01/1990",
  epsChatId: "573175180237@c.us",
  idNumber: "123456789",
  idType: "Cédula de ciudadanía",
  nothingToRenewAlertMessage: "nada",
  successAlertMessage: "ok",
  techAlertChatId: "57002@c.us",
  userToAlertChatId: "57001@c.us",
};

const ENV_KEYS = [
  "BIRTHDATE",
  "EPS_CHAT_ID",
  "EPS_CHAT_IDS_TO_LISTEN",
  "ID_NUMBER",
  "ID_TYPE",
  "NOTHING_TO_RENEW_ALERT_MESSAGE",
  "SUCCESS_ALERT_MESSAGE",
  "TECH_ALERT_CHAT_ID",
  "USER_TO_ALERT_CHAT_ID",
] as const;

afterEach(() => {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
  mock.restore();
});

async function resolveWithGlobalConfig(globalConfig: Record<string, string>) {
  mock.module("../../../infrastructure/config/global-store", () => ({
    loadGlobalConfig: () => Promise.resolve(globalConfig),
  }));

  const { resolveConfig } = await import(
    "../../../application/config/resolveConfig"
  );

  return resolveConfig();
}

describe("resolveConfig epsChatIdsToListen", () => {
  it("should use EPS_CHAT_IDS_TO_LISTEN from env when present", async () => {
    process.env.EPS_CHAT_IDS_TO_LISTEN =
      "573175180237@c.us|147626817245299@lid";

    const config = await resolveWithGlobalConfig(BASE_GLOBAL_CONFIG);

    expect(config.epsChatIdsToListen).toBe(
      "573175180237@c.us|147626817245299@lid",
    );
  });

  it("should use epsChatIdsToListen from global config when env is absent", async () => {
    const config = await resolveWithGlobalConfig({
      ...BASE_GLOBAL_CONFIG,
      epsChatIdsToListen: "147626817245299@lid",
    });

    expect(config.epsChatIdsToListen).toBe("147626817245299@lid");
  });

  it("should fall back to epsChatId when listen config is absent", async () => {
    const config = await resolveWithGlobalConfig(BASE_GLOBAL_CONFIG);

    expect(config.epsChatIdsToListen).toBe("573175180237@c.us");
  });
});
