// Build preview statis untuk GitHub Pages. Hasil di folder out/.
// Pakai: npm run build:preview  (opsional: PREVIEW_BASE_PATH=/nama-repo)
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const base = process.env.PREVIEW_BASE_PATH || "/pasti-cuan-preview";
execSync("npx next build", { stdio: "inherit", env: { ...process.env, PREVIEW_BASE_PATH: base } });
// GitHub Pages memakai Jekyll secara default dan membuang folder berawalan "_" seperti _next/
writeFileSync("out/.nojekyll", "");
console.log(`\nPreview siap di out/ untuk ${base}`);
