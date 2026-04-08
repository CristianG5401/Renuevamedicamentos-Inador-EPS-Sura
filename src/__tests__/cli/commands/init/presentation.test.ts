import { describe, it, expect, spyOn, afterEach, mock } from "bun:test";
import consola from "consola";
import {
  showExistingConfig,
  showFieldHint,
  showWelcomeBanner,
} from "../../../../cli/commands/init/presentation";
import type { ValidatedConfig } from "../../../../application/config/types";

// Restaura los spies después de cada test para que no contaminen el siguiente,
// incluso si un caso falla antes de terminar. Se centraliza aquí para que
// cualquier `spyOn` del archivo quede cubierto.
afterEach(() => {
  mock.restore();
});

const FULL_CONFIG: ValidatedConfig = {
  idType: "Cédula de ciudadanía",
  idNumber: "1234567890",
  birthdate: "01/01/1990",
  epsChatId: "573001234567@c.us",
  userToAlertChatId: "573007654321@c.us",
  successAlertMessage: "Renovación exitosa",
  nothingToRenewAlertMessage: "No hay nada por renovar",
  techAlertChatId: "573009999999@c.us",
};

describe("showExistingConfig", () => {
  it("should mask idNumber when displaying the existing config", () => {
    // Arrange
    // El cast es necesario porque `consola.info` está tipado como `LogFn`
    // (función invocable con propiedades extra), y un no-op simple no satisface
    // esa forma completa en tiempo de tipos.
    const infoSpy = spyOn(consola, "info").mockImplementation(
      (() => {}) as never,
    );

    // Act
    showExistingConfig(FULL_CONFIG);

    // Assert: el valor real nunca debe aparecer y la versión enmascarada sí.
    const allCalls = infoSpy.mock.calls.flat().join(" ");
    expect(allCalls).not.toContain("1234567890");
    expect(allCalls).toContain("123***7890");
  });

  it("should mask epsChatId with maskPhone", () => {
    // Arrange
    const infoSpy = spyOn(consola, "info").mockImplementation(
      (() => {}) as never,
    );

    // Act
    showExistingConfig(FULL_CONFIG);

    // Assert
    const allCalls = infoSpy.mock.calls.flat().join(" ");
    expect(allCalls).not.toContain("573001234567@c.us");
    expect(allCalls).toContain("5730***4567@c.us");
  });

  it("should mask userToAlertChatId with maskPhone", () => {
    // Arrange
    const infoSpy = spyOn(consola, "info").mockImplementation(
      (() => {}) as never,
    );

    // Act
    showExistingConfig(FULL_CONFIG);

    // Assert
    const allCalls = infoSpy.mock.calls.flat().join(" ");
    expect(allCalls).not.toContain("573007654321@c.us");
    expect(allCalls).toContain("5730***4321@c.us");
  });

  it("should mask techAlertChatId with maskPhone", () => {
    // Arrange
    const infoSpy = spyOn(consola, "info").mockImplementation(
      (() => {}) as never,
    );

    // Act
    showExistingConfig(FULL_CONFIG);

    // Assert
    const allCalls = infoSpy.mock.calls.flat().join(" ");
    expect(allCalls).not.toContain("573009999999@c.us");
    expect(allCalls).toContain("5730***9999@c.us");
  });

  it("should display non-sensitive fields verbatim", () => {
    // Arrange
    const infoSpy = spyOn(consola, "info").mockImplementation(
      (() => {}) as never,
    );

    // Act
    showExistingConfig(FULL_CONFIG);

    // Assert
    const allCalls = infoSpy.mock.calls.flat().join(" ");
    expect(allCalls).toContain("Cédula de ciudadanía");
    expect(allCalls).toContain("01/01/1990");
    expect(allCalls).toContain("Renovación exitosa");
    expect(allCalls).toContain("No hay nada por renovar");
  });

  it("should not print anything when given an empty config", () => {
    // Arrange
    const infoSpy = spyOn(consola, "info").mockImplementation(
      (() => {}) as never,
    );

    // Act
    // Un config parcial puede no traer campos si el resto viene por env vars.
    showExistingConfig({});

    // Assert
    expect(infoSpy).not.toHaveBeenCalled();
  });

  it("should ignore malformed non-string values instead of crashing", () => {
    // Arrange
    const infoSpy = spyOn(consola, "info").mockImplementation(
      (() => {}) as never,
    );

    // Act / Assert
    expect(() =>
      showExistingConfig({
        idNumber: 1234567890 as unknown as string,
        epsChatId: { bad: true } as unknown as string,
        userToAlertChatId: ["573001234567@c.us"] as unknown as string,
        techAlertChatId: false as unknown as string,
        birthdate: null as unknown as string,
      }),
    ).not.toThrow();

    expect(infoSpy).not.toHaveBeenCalled();
  });
});

describe("showFieldHint", () => {
  it("should print a hint for epsChatId that mentions how to find it", () => {
    // Arrange
    const infoSpy = spyOn(consola, "info").mockImplementation(
      (() => {}) as never,
    );

    // Act
    showFieldHint("epsChatId");

    // Assert
    const output = infoSpy.mock.calls.flat().join(" ");
    // Solo se valida el concepto clave para no acoplar el test al texto exacto.
    expect(output.toLowerCase()).toContain("whatsapp");
  });

  it("should print a hint for birthdate with the expected format", () => {
    // Arrange
    const infoSpy = spyOn(consola, "info").mockImplementation(
      (() => {}) as never,
    );

    // Act
    showFieldHint("birthdate");

    // Assert
    const output = infoSpy.mock.calls.flat().join(" ");
    expect(output).toContain("DD/MM/AAAA");
  });

  it("should do nothing for fields without a registered hint", () => {
    // Arrange
    const infoSpy = spyOn(consola, "info").mockImplementation(
      (() => {}) as never,
    );

    // Act
    // `idType` es una lista de selección, así que no necesita ayuda adicional.
    showFieldHint("idType");

    // Assert
    expect(infoSpy).not.toHaveBeenCalled();
  });
});

describe("showWelcomeBanner", () => {
  it("should call consola.box and print the resolved config path", () => {
    // Arrange
    const boxSpy = spyOn(consola, "box").mockImplementation(
      (() => {}) as never,
    );
    const infoSpy = spyOn(consola, "info").mockImplementation(
      (() => {}) as never,
    );

    // Act
    showWelcomeBanner("/tmp/fake/config.json");

    // Assert
    // El banner debe renderizarse en una caja y mencionar la ruta final.
    expect(boxSpy).toHaveBeenCalled();
    const infoOutput = infoSpy.mock.calls.flat().join(" ");
    expect(infoOutput).toContain("/tmp/fake/config.json");
  });
});
