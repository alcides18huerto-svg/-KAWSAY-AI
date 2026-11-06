/// <reference types="vitest" />
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * Simulador estático de la raíz del repositorio (index.html + assets + modules).
 * No necesita backend ni base de datos: es la demo de respaldo del login.
 * En local vive en la raíz del repo; en Docker se copia a teacher-web/demo-src.
 */
const demoRoot = [path.resolve(here, ".."), path.resolve(here, "demo-src")].find(
  (dir) => fs.existsSync(path.join(dir, "index.html")) && fs.existsSync(path.join(dir, "assets")),
);

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

function copyDir(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function copyDemo(outDir: string): void {
  if (!demoRoot) return;
  const target = path.join(outDir, "demo");
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(target, { recursive: true });
  fs.copyFileSync(path.join(demoRoot, "index.html"), path.join(target, "index.html"));
  for (const dir of ["assets", "modules"]) copyDir(path.join(demoRoot, dir), path.join(target, dir));
  console.log(`[kawsay-demo] simulador estático copiado a ${target}`);
}

function staticDemo(): Plugin {
  return {
    name: "kawsay-static-demo",
    configureServer(server) {
      if (!demoRoot) return;
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? "/").split("?")[0] ?? "/";
        if (url !== "/demo" && !url.startsWith("/demo/")) return next();
        const rel = url.replace(/^\/demo\/?/, "") || "index.html";
        const file = path.resolve(demoRoot, rel);
        if (!file.startsWith(demoRoot) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return next();
        res.setHeader("Content-Type", MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream");
        res.setHeader("Cache-Control", "no-cache");
        fs.createReadStream(file).pipe(res);
      });
    },
    closeBundle() {
      copyDemo(path.resolve(here, "dist"));
    },
  };
}

export default defineConfig({
  plugins: [react(), staticDemo()],
  server: { port: 5173, proxy: { "/api": { target: "http://127.0.0.1:8000", changeOrigin: true } } },
  test: { include: ["src/**/*.test.{ts,tsx}"], environment: "jsdom", globals: true, testTimeout: 15000, setupFiles: ["./src/test/setup.ts"] },
});
