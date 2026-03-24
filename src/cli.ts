import { defineCommand, runMain } from "citty";

import renew from "./commands/renew";

const main = defineCommand({
  meta: {
    name: "inador",
    version: "1.0.0",
    description:
      "Bot CLI para renovación automática de medicamentos en EPS colombianas",
  },
  subCommands: {
    renew,
  },
});

runMain(main);
