// Build preview statis lalu unggah HANYA hasil build (folder out/) ke repo GitHub Pages publik.
// Kode sumber tidak ikut diunggah. Butuh GitHub CLI (gh) yang sudah login.
// Pakai: npm run publish:preview
import { execSync } from "node:child_process";

const REPO = process.env.PREVIEW_REPO || "Saldmonela/pasti-cuan-preview";
const nama = REPO.split("/")[1];
const run = (cmd, opts = {}) => execSync(cmd, { stdio: "inherit", ...opts });

run("node scripts/build-preview.mjs", { env: { ...process.env, PREVIEW_BASE_PATH: `/${nama}` } });

const ada = (() => {
  try {
    execSync(`gh repo view ${REPO}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();
if (!ada) {
  run(`gh repo create ${REPO} --public --description "Preview prototype Pasti Cuan (hasil build saja)"`);
}

const out = { cwd: "out" };
const sumber = execSync("git rev-parse --short HEAD").toString().trim();
run("git init -q -b main", out);
run("git -c core.autocrlf=false add -A", out);
run(`git -c user.name="preview-bot" -c user.email="preview@localhost" commit -q -m "Preview dari ${sumber}"`, out);
run(`git push -q -f https://github.com/${REPO}.git main`, out);

if (!ada) {
  run(`gh api -X POST repos/${REPO}/pages -f "source[branch]=main" -f "source[path]=/"`, { stdio: "ignore" });
}
console.log(`\nTerunggah. Link: https://${REPO.split("/")[0].toLowerCase()}.github.io/${nama}/ (butuh 1-2 menit untuk update)`);
