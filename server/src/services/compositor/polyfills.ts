// polyfills.ts
import { Crypto } from "@peculiar/webcrypto";
import { WebSocket } from "ws";

// WebCrypto
if (!globalThis.crypto) {
  (globalThis as any).crypto = new Crypto();
}

// WebSocket (for real-time features)
if (!globalThis.WebSocket) {
  (globalThis as any).WebSocket = WebSocket as any;
}

// Global Navigator polyfill for Node < 21 (Node 20 fallback)
if (typeof globalThis.navigator === "undefined") {
  (globalThis as any).navigator = {
    userAgent: "Mozilla/5.0 (Node.js Headless SSR) OpenVideo/1.3.1",
    appVersion: "1.3.1",
    platform: "Node.js",
    language: "en-US",
    languages: ["en-US", "vi-VN", "zh-CN"],
    hardwareConcurrency: 4,
  };
}

if (typeof globalThis.window === "undefined") {
  (globalThis as any).window = globalThis;
}

if (typeof globalThis.document === "undefined") {
  (globalThis as any).document = {
    createElement: (tag: string) => ({
      tagName: tag.toUpperCase(),
      style: {},
      setAttribute: () => {},
      getAttribute: () => null,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
    createElementNS: (_ns: string, tag: string) => ({
      tagName: tag.toUpperCase(),
      style: {},
      setAttribute: () => {},
      getAttribute: () => null,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
    head: { appendChild: () => {} },
    body: { appendChild: () => {} },
  };
}

// Fetch API
if (!globalThis.fetch && typeof fetch !== "undefined") {
  globalThis.fetch = fetch;
}