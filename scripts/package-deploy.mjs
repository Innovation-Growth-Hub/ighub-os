// Builds the two Hostinger upload packages:
//   deploy/ighubos-web.zip  → os.ighub.ng   (Hostinger detects Next.js; start: node .next/standalone/server.js)
//   deploy/ighubos-api.zip  → api.ighub.ng  (Hostinger detects Express; start: node main.mjs)
//
//   pnpm package:deploy                       (API_ORIGIN defaults to https://api.ighub.ng)
//   API_ORIGIN=https://staging-api.example pnpm package:deploy
import { execSync } from "node:child_process";
import path from "node:path";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";

const API_ORIGIN = process.env.API_ORIGIN ?? "https://api.ighub.ng";
const run = (cmd, env = {}, cwd) => execSync(cmd, { stdio: "inherit", cwd, env: { ...process.env, ...env } });
const webPkg = JSON.parse(await readFile("apps/web/package.json", "utf8"));

await rm("deploy", { recursive: true, force: true });
await mkdir("deploy", { recursive: true });

console.log(`\n▶ Building packages + web (API_ORIGIN=${API_ORIGIN})`);
run("pnpm --filter @ighub/shared --filter @ighub/db build");
// Rewrites are baked in at build time, so the production API origin must be set here.
run("pnpm --filter @ighub/web build", { API_ORIGIN, NEXT_TELEMETRY_DISABLED: "1" });

console.log("\n▶ Assembling web");
// Ship the built app without node_modules: Hostinger runs `npm install` itself, and
// @ighub/shared is already compiled into the server chunks.
const web = "deploy/web";
// Standard Next.js standalone layout, which Hostinger's Next.js preset checks for:
//   .next/standalone/server.js (+ its .next, static, public)   .next/static   .next/BUILD_ID   public
// The monorepo build nests the app at standalone/apps/web, so lift it to standalone/.
const sa = `${web}/.next/standalone`;
await cp("apps/web/.next/standalone/apps/web", sa, { recursive: true });
await rm(`${sa}/node_modules`, { recursive: true, force: true });
// The standalone folder must carry its own runtime deps: hosts may publish only this
// folder and run server.js without installing anything (Hostinger does). The monorepo
// build's traced node_modules uses pnpm symlinks, so install a flat copy instead.
await writeFile(
  `${sa}/package.json`,
  JSON.stringify(
    {
      private: true,
      dependencies: { next: webPkg.dependencies.next, react: webPkg.dependencies.react, "react-dom": webPkg.dependencies["react-dom"] },
    },
    null,
    2,
  ) + "\n",
);
// Optional deps are platform binaries (swc, sharp) that the prebuilt server doesn't need.
run("npm install --omit=dev --omit=optional --no-audit --no-fund --no-package-lock", {}, sa);
await cp("apps/web/.next/static", `${sa}/.next/static`, { recursive: true });
await cp("apps/web/public", `${sa}/public`, { recursive: true });
// Hosts may run .next/standalone/server.js directly (Hostinger's Next.js preset has no
// start-command setting), so force the bind address inside the server file itself.
const serverFile = `${sa}/server.js`;
await writeFile(
  serverFile,
  `// [ighubos] Linux sets HOSTNAME to the machine name; bind to all interfaces instead.\nprocess.env.HOSTNAME = process.env.BIND_HOST || "0.0.0.0";\nconsole.log("[ighubos-web] listening on " + process.env.HOSTNAME + ":" + (process.env.PORT || 3000));\n` +
    (await readFile(serverFile, "utf8")),
);
// Also a complete .next at the top, so a plain `next start` works if the host uses it.
await cp("apps/web/.next/standalone/apps/web/.next", `${web}/.next`, { recursive: true });
await cp("apps/web/.next/static", `${web}/.next/static`, { recursive: true });
await cp("apps/web/.next/BUILD_ID", `${web}/.next/BUILD_ID`);
// Linux sets HOSTNAME to the machine name and Next's standalone server binds to it, so
// the host's proxy (connecting on 127.0.0.1) gets a 503. Force all interfaces.
await writeFile(
  `${web}/start.js`,
  [
    "// Starts the prebuilt Next.js server on all interfaces (see scripts/package-deploy.mjs).",
    `require("./.next/standalone/server.js");`,
    "",
  ].join("\n"),
);
await cp("apps/web/public", `${web}/public`, { recursive: true });
const webManifest = {
  name: "ighubos-web",
  private: true,
  main: "start.js",
  // Prebuilt: Hostinger detects Next.js from these deps, installs them, and runs `start`.
  scripts: { build: "echo Prebuilt standalone Next.js app", start: "node start.js" },
  dependencies: {
    next: webPkg.dependencies.next,
    react: webPkg.dependencies.react,
    "react-dom": webPkg.dependencies["react-dom"],
  },
  engines: { node: ">=22.12" },
};
await writeFile(`${web}/package.json`, JSON.stringify(webManifest, null, 2) + "\n");

console.log("\n▶ Bundling API");
run("pnpm --filter @ighub/api bundle");
await cp("apps/api/bundle", "deploy/api", { recursive: true });

console.log("\n▶ Zipping");
// Real zips need bsdtar (Windows' built-in tar.exe, or macOS tar). Git Bash's GNU tar
// would silently write a plain tar with a .zip name, which Hostinger rejects.
const tar = process.platform === "win32" ? `"${path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe")}"` : "tar";
const apiFiles = (await readdir("deploy/api")).join(" ");
run(`${tar} -a -cf ../ighubos-web.zip package.json start.js .next public`, {}, "deploy/web");
run(`${tar} -a -cf ../ighubos-api.zip ${apiFiles}`, {}, "deploy/api");
console.log("\n✔ deploy/ighubos-web.zip and deploy/ighubos-api.zip are ready.");
