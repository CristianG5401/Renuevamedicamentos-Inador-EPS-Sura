import { defineCommand } from "citty";

import { initCommand } from "./commands/init/command";
import { renewCommand } from "./commands/renew/command";
import pkg from "../../package.json";

export const mainCommand = defineCommand({
  meta: {
    name: pkg.name,
    version: pkg.version,
    description: "Bot para automatizar la renovación de medicamentos en SURA",
  },
  subCommands: {
    init: initCommand,
    renew: renewCommand,
  },
});
