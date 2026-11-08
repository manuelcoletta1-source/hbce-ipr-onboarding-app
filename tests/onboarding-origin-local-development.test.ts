import { afterEach, describe, expect, it, vi } from "vitest";
import {
  validateHbceAppOrigin,
  validateStateChangingRequestOrigin,
} from "../lib/server/onboarding-origin-policy";

describe("HBCE local development Origin exception", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts localhost:3000 only in development", () => {
    vi.stubEnv("NODE_ENV", "development");

    expect(
      validateHbceAppOrigin("http://localhost:3000")
    ).toBe("http://localhost:3000");

    expect(
      validateStateChangingRequestOrigin(
        "http://localhost:3000",
        "http://localhost:3000"
      )
    ).toBe("http://localhost:3000");
  });

  it("rejects HTTP localhost in production", () => {
    vi.stubEnv("NODE_ENV", "production");

    expect(() =>
      validateHbceAppOrigin("http://localhost:3000")
    ).toThrow();
  });

  it("rejects HTTP localhost in test environment", () => {
    vi.stubEnv("NODE_ENV", "test");

    expect(() =>
      validateHbceAppOrigin("http://localhost:3000")
    ).toThrow();
  });

  it("rejects other HTTP hosts in development", () => {
    vi.stubEnv("NODE_ENV", "development");

    for (const origin of [
      "http://example.com",
      "http://127.0.0.1:3000",
      "http://localhost:3001",
    ]) {
      expect(() => validateHbceAppOrigin(origin)).toThrow();
    }
  });

  it("rejects a mismatched request Origin", () => {
    vi.stubEnv("NODE_ENV", "development");

    expect(() =>
      validateStateChangingRequestOrigin(
        "http://example.com",
        "http://localhost:3000"
      )
    ).toThrow();
  });

  it("continues accepting HTTPS in production", () => {
    vi.stubEnv("NODE_ENV", "production");

    expect(
      validateHbceAppOrigin("https://example.com")
    ).toBe("https://example.com");
  });
});
