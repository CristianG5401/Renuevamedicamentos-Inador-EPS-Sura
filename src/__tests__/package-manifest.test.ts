import { describe, expect, it } from "bun:test";
import packageJson from "../../package.json";

describe("package manifest", () => {
  it("should be configured as a public Bun-first CLI package", () => {
    expect(packageJson.name).toBe("renuevamedicamentos-inador");
    expect(packageJson.private).toBeUndefined();
    expect(packageJson.bin).toEqual({
      "renuevamedicamentos-inador": "./dist/cli.js",
    });
    expect(packageJson.files).toEqual(["dist", "README.md", "LICENSE"]);
    expect(packageJson.publishConfig).toEqual({ access: "public" });
  });

  it("should provide release scripts for building and validating the package", () => {
    expect(packageJson.scripts.build).toBe("bun run bundle.ts");
    expect(packageJson.scripts.prepublishOnly).toBe("bun run build");
    expect(packageJson.scripts["pack:dry-run"]).toBe("bun pm pack --dry-run");
  });
});
