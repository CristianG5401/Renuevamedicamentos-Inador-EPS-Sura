import { describe, expect, it } from "bun:test";
import { mainCommand } from "../../cli/main";

type MainCommandTestView = {
  subCommands?: {
    init?: unknown;
    renew?: unknown;
  };
  meta?: {
    name?: string;
  };
};

const mainCommandView = mainCommand as unknown as MainCommandTestView;

describe("mainCommand", () => {
  it("should register the init and renew subcommands", () => {
    expect(mainCommandView.subCommands).toBeDefined();
    expect(mainCommandView.subCommands?.init).toBeDefined();
    expect(mainCommandView.subCommands?.renew).toBeDefined();
  });

  it("should expose the public CLI package name in command metadata", () => {
    expect(mainCommandView.meta?.name).toBe("renuevamedicamentos-inador");
  });
});
