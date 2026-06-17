import { spawnSync } from "node:child_process";

const token = process.env.CHROMATIC_PROJECT_TOKEN;
if (!token) {
  console.error("CHROMATIC_PROJECT_TOKEN environment variable is required");
  process.exit(1);
}

const result = spawnSync("npx", ["chromatic", `--project-token=${token}`], {
  stdio: "inherit",
  shell: true,
});

process.exit(result.status ?? 1);
