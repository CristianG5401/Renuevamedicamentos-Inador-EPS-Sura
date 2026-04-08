import { describe, expect, it } from "bun:test";
import { mainCommand } from "../../cli/main";

describe("mainCommand", () => {
  it("should register the init and renew subcommands", () => {
    expect(mainCommand.subCommands).toBeDefined();
    expect(mainCommand.subCommands?.init).toBeDefined();
    expect(mainCommand.subCommands?.renew).toBeDefined();
  });
});
