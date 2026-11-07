// Builds the two Hostinger upload packages:
//   deploy/ighubos-web.zip  → os.ighub.com.ng   (start: node apps/web/server.js)
//   deploy/ighubos-api.zip  → api.ighub.com.ng  (start: node main.mjs)
//
//   pnpm package:deploy                       (API_ORIGIN defaults to https://api.ighub.com.ng)
//   API_ORIGIN=https://staging-api.example pnpm package:deploy
import { execSync } from "node:child_process";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";

const API_ORIGIN = process.env.API_ORIGIN ?? "https://api.ighub.com.ng";
const run = (cmd, env = {}, cwd) => execSync(cmd, { stdio: "inherit", cwd, env: { ...process.env, ...env } });

await rm("deploy", { recursive: true, force: true });
await mkdir("deploy", { recursive: true });

console.log(`\n▶ Building packages + web (API_ORIGIN=${API_ORIGIN})`);
run("pnpm --filter @ighub/shared --filter @ighub/db build");
// Rewrites are baked in at build time, so the production API origin must be set here.
run("pnpm --filter @ighub/web build", { API_ORIGIN, NEXT_TELEMETRY_DISABLED: "1" });

console.log("\n▶ Assembling web");
const web = "deploy/web";
await cp("apps/web/.next/standalone", web, { recursive: true });
await cp("apps/web/.next/static", `${web}/apps/web/.next/static`, { recursive: true });
await cp("apps/web/public", `${web}/apps/web/public`, { recursive: true });
await writeFile(
  `${web}/package.json`,
  JSON.stringify({ name: "ighubos-web", private: true, scripts: { start: "node apps/web/server.js" }, engines: { node: ">=22.12" } }, null, 2) + "\n",
);

console.log("\n▶ Bundling API");
run("pnpm --filter @ighub/api bundle");
await cp("apps/api/bundle", "deploy/api", { recursive: true });

console.log("\n▶ Zipping");
// bsdtar (built into Windows 10+ and macOS) writes a zip when the name ends in .zip.
// Dot-folders (.next) must be listed explicitly, so zip the folder contents by name.
run("tar -a -cf ../ighubos-web.zip package.json apps node_modules", {}, "deploy/web");
run("tar -a -cf ../ighubos-api.zip *", {}, "deploy/api");
console.log("\n✔ deploy/ighubos-web.zip and deploy/ighubos-api.zip are ready.");
