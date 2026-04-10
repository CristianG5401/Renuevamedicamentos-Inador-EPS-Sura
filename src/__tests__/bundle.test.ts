import { describe, expect, it } from "bun:test";
import { rm, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const projectRootPath = fileURLToPath(new URL("../../", import.meta.url));
const builtCliPath = fileURLToPath(new URL("../../dist/cli.js", import.meta.url));

describe("bundle script", () => {
  it("should build a publishable CLI with a Bun shebang", async () => {
    await rm(builtCliPath, { force: true });

    const buildProcess = Bun.spawn(["bun", "run", "build"], {
      cwd: projectRootPath,
      stdout: "pipe",
      stderr: "pipe",
    });

    const exitCode = await buildProcess.exited;

    expect(exitCode).toBe(0);

    const builtCli = Bun.file(builtCliPath);
    const builtCliContents = await builtCli.text();
    const builtCliStats = await stat(builtCliPath);

    expect(await builtCli.exists()).toBe(true);
    expect(builtCliContents.startsWith("#!/usr/bin/env bun\n")).toBe(true);
    expect(builtCliStats.mode & 0o111).not.toBe(0);
  });
});
