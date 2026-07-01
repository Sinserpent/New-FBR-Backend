import { exec } from "child_process";
import path from "path";
import fs from "fs";

/**
 * Run MongoDB backup
 * - Daily backups (keeps last 7)
 * - Weekly snapshots (Sunday) محفوظ in /weekly
 */
export const runBackup = () => {
  return new Promise((resolve, reject) => {
    try {
      const backupRoot = path.join(process.cwd(), "backups");
      const weeklyRoot = path.join(backupRoot, "weekly");

      // Ensure directories exist
      if (!fs.existsSync(backupRoot)) {
        fs.mkdirSync(backupRoot, { recursive: true });
      }
      if (!fs.existsSync(weeklyRoot)) {
        fs.mkdirSync(weeklyRoot, { recursive: true });
      }

      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, "-");
      const dailyFolder = path.join(backupRoot, timestamp);

      const command = `/usr/bin/mongodump --uri="${process.env.MONGODB_URL}" --out="${dailyFolder}"`;;

      exec(command, (error, stdout, stderr) => {
        if (error) {
          return reject(new Error(stderr || error.message));
        }

        try {
          /* -----------------------
             DAILY CLEANUP (keep 7)
          ----------------------- */
          const entries = fs
            .readdirSync(backupRoot)
            .filter((f) => f !== "weekly")
            .map((name) => ({
              name,
              time: fs.statSync(path.join(backupRoot, name)).mtime.getTime(),
            }))
            .sort((a, b) => b.time - a.time);

          entries.slice(7).forEach((entry) => {
            fs.rmSync(path.join(backupRoot, entry.name), {
              recursive: true,
              force: true,
            });
          });

          /* -----------------------
             WEEKLY SNAPSHOT (Sunday)
          ----------------------- */
          if (now.getDay() === 0) {
            const weeklyFolder = path.join(weeklyRoot, timestamp);

            fs.cpSync(dailyFolder, weeklyFolder, {
              recursive: true,
            });

            console.log("Weekly backup saved:", weeklyFolder);
          }

        } catch (cleanupErr) {
          console.warn("Cleanup warning:", cleanupErr.message);
        }

        resolve({
          message: "Backup successful",
          path: dailyFolder,
        });
      });
    } catch (err) {
      reject(err);
    }
  });
};