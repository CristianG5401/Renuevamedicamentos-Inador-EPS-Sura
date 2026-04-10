import { chmod, rm } from "node:fs/promises";

const CLI_ENTRYPOINT = "./src/cli.ts";
const CLI_OUTDIR = "./dist";
const CLI_OUTFILE = `${CLI_OUTDIR}/cli.js`;
const BUN_SHEBANG = "#!/usr/bin/env bun\n";
const EXECUTABLE_PERMISSIONS = 0o755;

/**
 * Construye la CLI publicable en dist/ dejando las dependencias externas
 * para que el paquete instalado resuelva `whatsapp-web.js` desde node_modules.
 */
async function buildCliBundle(): Promise<void> {
  await rm(CLI_OUTDIR, { force: true, recursive: true });
  await rm("./cli.js", { force: true });

  await Bun.build({
    entrypoints: [CLI_ENTRYPOINT],
    outdir: CLI_OUTDIR,
    naming: {
      entry: "cli.js",
    },
    target: "bun",
    format: "esm",
    packages: "external",
    banner: BUN_SHEBANG,
    minify: true,
  });

  await chmod(CLI_OUTFILE, EXECUTABLE_PERMISSIONS);
}

await buildCliBundle();
