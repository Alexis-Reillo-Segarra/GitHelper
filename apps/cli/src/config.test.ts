import { describe, it, expect } from "vitest";
import { isConfigKey, maskValue } from "./config";

describe("isConfigKey", () => {
    it("reconoce las claves de configuración válidas", () => {
        expect(isConfigKey("GITHUB_TOKEN")).toBe(true);
        expect(isConfigKey("AI_PROVIDER")).toBe(true);
        expect(isConfigKey("OPENAI_API_KEY")).toBe(true);
    });

    it("rechaza claves desconocidas o vacías", () => {
        expect(isConfigKey("FOO")).toBe(false);
        expect(isConfigKey("")).toBe(false);
        expect(isConfigKey("github_token")).toBe(false); // sensible a mayúsculas
    });
});

describe("maskValue", () => {
    it("enmascara secretos dejando solo los últimos 4 caracteres", () => {
        expect(maskValue("GITHUB_TOKEN", "ghp_supersecret1234")).toBe("••••••1234");
        expect(maskValue("OPENAI_API_KEY", "sk-abcdefgh9876")).toBe("••••••9876");
    });

    it("no enmascara valores que no son secretos", () => {
        expect(maskValue("AI_PROVIDER", "gemini")).toBe("gemini");
        expect(maskValue("AI_MODEL", "gemini-2.5-flash")).toBe("gemini-2.5-flash");
    });

    it("no enmascara secretos demasiado cortos (<=4)", () => {
        expect(maskValue("GITHUB_TOKEN", "abcd")).toBe("abcd");
    });
});
