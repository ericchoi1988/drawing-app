// Plain JS build script — compatible with Node 12+
// Replaces script/build.ts so no tsx/ESM runner is required

const esbuild = require("esbuild");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

async function buildAll() {
  // Clean dist
  if (fs.existsSync("dist")) {
    fs.rmSync("dist", { recursive: true, force: true });
  }

  // Build frontend with Vite (vite CLI works on Node 12)
  console.log("building client...");
  execSync("npx vite build", { stdio: "inherit" });

  // Build server with esbuild targeting Node 12
  console.log("building server...");
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];

  const allowlist = [
    "@google/generative-ai",
    "axios",
    "cors",
    "date-fns",
    "drizzle-orm",
    "drizzle-zod",
    "express",
    "express-rate-limit",
    "express-session",
    "jsonwebtoken",
    "memorystore",
    "multer",
    "nanoid",
    "nodemailer",
    "openai",
    "passport",
    "passport-local",
    "stripe",
    "uuid",
    "ws",
    "xlsx",
    "zod",
    "zod-validation-error",
  ];

  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild.build({
    entryPoints: ["server/index.ts"],
    platform: "node",
    target: "node12",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });

  console.log("build complete.");
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
