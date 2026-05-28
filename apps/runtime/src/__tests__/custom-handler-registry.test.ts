import { describe, it, expect } from "vitest";
import { CustomHandlerRegistry } from "../custom-handler-registry";
import type { CustomHandler } from "../interpreter/types";

describe("CustomHandlerRegistry", () => {
  const handlerA: CustomHandler = async (config) => config;
  const handlerB: CustomHandler = async () => ({ ok: true });

  it("registers and retrieves a handler", () => {
    const registry = new CustomHandlerRegistry();
    registry.register("myHandler", handlerA);
    expect(registry.get("myHandler")).toBe(handlerA);
  });

  it("returns undefined for unknown handler", () => {
    const registry = new CustomHandlerRegistry();
    expect(registry.get("nonexistent")).toBeUndefined();
  });

  it("has returns correct values", () => {
    const registry = new CustomHandlerRegistry();
    registry.register("a", handlerA);
    expect(registry.has("a")).toBe(true);
    expect(registry.has("b")).toBe(false);
  });

  it("remove deletes a handler", () => {
    const registry = new CustomHandlerRegistry();
    registry.register("a", handlerA);
    expect(registry.remove("a")).toBe(true);
    expect(registry.get("a")).toBeUndefined();
    expect(registry.remove("a")).toBe(false);
  });

  it("list returns all registered names", () => {
    const registry = new CustomHandlerRegistry();
    registry.register("a", handlerA);
    registry.register("b", handlerB);
    expect(registry.list().sort()).toEqual(["a", "b"]);
  });

  it("overwrites existing handler on re-register", () => {
    const registry = new CustomHandlerRegistry();
    registry.register("x", handlerA);
    registry.register("x", handlerB);
    expect(registry.get("x")).toBe(handlerB);
  });
});
