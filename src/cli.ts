import { defineCommand, runMain } from "citty";

// Comandos
import { initCommand } from "./commands/init";
import { renewCommand } from "./commands/renew";
// Metadata
import pkg from "../package.json";

const main = defineCommand({
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

runMain(main);
