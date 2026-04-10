import { describe, expect, it } from "bun:test";
import { mainCommand } from "../../cli/main";

describe("mainCommand", () => {
  it("should register the init and renew subcommands", () => {
    expect(mainCommand.subCommands).toBeDefined();
    expect(mainCommand.subCommands?.init).toBeDefined();
    expect(mainCommand.subCommands?.renew).toBeDefined();
  });

  it("should expose the public CLI package name in command metadata", () => {
    expect(mainCommand.meta?.name).toBe("renuevamedicamentos-inador");
  });
});
