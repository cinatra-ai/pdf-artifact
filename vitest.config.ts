import { defineConfig } from "vitest/config";

// Node-env: the renderer JSX is asserted structurally (source contracts) and the
// pure capability logic is unit-tested, matching the host PDF-handler test
// convention — no jsdom needed. Tests read repo-relative source paths from the
// repo root.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
