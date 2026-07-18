import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const manifest = require("../public/manifest.json");

const required = [
  "README.md",
  "LICENSE",
  "PRIVACY.md",
  "public/icons/icon-16.png",
  "public/icons/icon-32.png",
  "public/icons/icon-48.png",
  "public/icons/icon-128.png",
  "store-assets/small-promo-440x280.png",
  "store-assets/marquee-1400x560.png",
  "store-assets/github-social-preview.png",
  "store-assets/screenshots/01-pick-from-page.png",
  "store-listing/LISTING.md",
  "store-listing/PRIVACY-PRACTICES.md",
];

for (const path of required) {
  if (!existsSync(path)) throw new Error(`Missing release file: ${path}`);
}

if (manifest.manifest_version !== 3) throw new Error("Manifest V3 is required");
if (manifest.permissions.some((permission) => permission !== "storage")) {
  throw new Error("Unexpected extension permission detected");
}

const summary = readFileSync("store-listing/LISTING.md", "utf8")
  .split("## Short summary\n\n")[1]
  .split("\n")[0];
if (summary.length > 132) throw new Error("Store summary exceeds 132 characters");

execFileSync("npm", ["run", "build"], { stdio: "inherit" });
console.log("Release verification passed.");
