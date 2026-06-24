import fs from "fs";
import path from "path";

const source = path.join(process.cwd(), "migrations");
const target = path.join(process.cwd(), "dist", "migrations");

if (!fs.existsSync(source)) {
  console.warn("copy-migrations: no migrations/ directory found — skipping");
  process.exit(0);
}

fs.cpSync(source, target, { recursive: true });
console.log(`copy-migrations: copied ${source} → ${target}`);
