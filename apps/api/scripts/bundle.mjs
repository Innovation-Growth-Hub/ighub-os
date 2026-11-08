// Bundles the compiled API (dist/, decorator metadata already emitted by tsc)
// into self-contained ESM files for Hostinger: no node_modules, no pnpm needed.
//   pnpm --filter @ighub/api bundle   →  apps/api/bundle/
import { build } from "esbuild";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";

const out = "bundle";
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

await build({
  entryPoints: { main: "dist/main.js", migrate: "dist/scripts/migrate.js", "create-admin": "dist/scripts/create-admin.js" },
  outdir: out,
  outExtension: { ".js": ".mjs" },
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  splitting: true,
  sourcemap: true,
  legalComments: "none",
  // Optional Nest integrations we don't use; Nest loads them lazily if present.
  external: [
    "@nestjs/microservices",
    "@nestjs/microservices/*",
    "@nestjs/websockets",
    "@nestjs/websockets/*",
    "class-validator",
    "class-transformer",
    "@fastify/static",
    "@nestjs/platform-socket.io",
  ],
  // CommonJS deps (mysql2, express…) call require(); give the ESM bundle one.
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
  logLevel: "warning",
});

await cp("../../packages/db/migrations", `${out}/migrations`, { recursive: true });
await writeFile(
  `${out}/package.json`,
  JSON.stringify(
    {
      name: "ighubos-api",
      private: true,
      type: "module",
      main: "main.mjs",
      // Everything is bundled; express is listed only so Hostinger detects a Node server app.
      scripts: { build: "echo Prebuilt bundle", start: "node main.mjs", migrate: "node migrate.mjs" },
      dependencies: { express: "^5.3.0" },
      engines: { node: ">=22.12" },
    },
    null,
    2,
  ) + "\n",
);
console.log(`API bundled into apps/api/${out}/`);
