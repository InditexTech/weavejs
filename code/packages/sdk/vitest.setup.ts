import { beforeEach, vi } from "vitest";
// import "@testing-library/jest-dom/vitest";
// import "@testing-library/user-event";

beforeEach(() => {
  // vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "debug").mockImplementation(() => {});
  vi.spyOn(console, "trace").mockImplementation(() => {});
  vi.spyOn(console, "groupCollapsed").mockImplementation(() => {});
  vi.spyOn(console, "group").mockImplementation(() => {});
  vi.spyOn(console, "groupEnd").mockImplementation(() => {});
  vi.spyOn(console, "dir").mockImplementation(() => {});
});
