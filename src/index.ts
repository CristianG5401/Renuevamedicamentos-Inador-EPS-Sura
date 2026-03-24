import { defineCommand, runMain } from "citty";

// Comandos
import { renewCommand } from "./commands/renew";

const main = defineCommand({
  meta: {
    name: "renuevamedicamentos-inador",
    version: "0.0.1",
    description: "Bot para automatizar la renovación de medicamentos en SURA",
  },
  subCommands: {
    renew: renewCommand,
  },
});

runMain(main);
