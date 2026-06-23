import "dotenv/config";
import { applyPendingMigrations } from "./apply-migrations";

applyPendingMigrations()
  .then(() => {
    console.log("Migrations complete.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
