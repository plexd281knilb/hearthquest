import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = path.resolve(__dirname, "..");
const VERSION_JSON_PATH = path.join(ROOT_DIR, "version.json");
const SHARED_VERSION_TS_PATH = path.join(ROOT_DIR, "packages", "shared-types", "src", "version.ts");

const PACKAGE_JSON_PATHS = [
  path.join(ROOT_DIR, "package.json"),
  path.join(ROOT_DIR, "packages", "shared-types", "package.json"),
  path.join(ROOT_DIR, "packages", "srd-rules", "package.json"),
  path.join(ROOT_DIR, "apps", "quest-ai-bridge", "package.json"),
  path.join(ROOT_DIR, "apps", "quest-vtt", "package.json"),
  path.join(ROOT_DIR, "apps", "quest-admin", "package.json"),
];

interface VersionManifest {
  version: string;
  buildNumber: number;
  defaultChannel: "dev" | "beta" | "main";
  updatedAt: string;
}

function readVersionManifest(): VersionManifest {
  return JSON.parse(fs.readFileSync(VERSION_JSON_PATH, "utf8"));
}

function bumpSemver(version: string, mode: "patch" | "minor" | "major"): string {
  const parts = version.split(".").map((n) => Number(n));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    throw new Error(`Invalid semantic version: ${version}`);
  }
  const [major, minor, patch] = parts;
  if (mode === "major") return `${major + 1}.0.0`;
  if (mode === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

function collectHearthQuestSkillPaths(): string[] {
  const skillPaths: string[] = [];
  for (const baseDir of [
    path.join(ROOT_DIR, ".agents", "skills"),
    path.join(ROOT_DIR, ".gemini", "skills"),
  ]) {
    if (!fs.existsSync(baseDir)) continue;
    for (const entry of fs.readdirSync(baseDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const skillMd = path.join(baseDir, entry.name, "SKILL.md");
      if (fs.existsSync(skillMd)) {
        skillPaths.push(skillMd);
      }
    }
  }
  return skillPaths.sort();
}

function syncSkillsBuildStamp(manifest: VersionManifest): number {
  const stampBlock =
    `<!-- HEARTHQUEST_SKILL_BUILD_STAMP:START -->\n` +
    `- **Last Verified Build**: \`v${manifest.version}\` (Build \`#${manifest.buildNumber}\`)\n` +
    `- **Updated At**: \`${manifest.updatedAt}\`\n` +
    `<!-- HEARTHQUEST_SKILL_BUILD_STAMP:END -->`;
  const skillPaths = collectHearthQuestSkillPaths();
  for (const skillPath of skillPaths) {
    let text = fs.readFileSync(skillPath, "utf8");
    const regex = /<!-- HEARTHQUEST_SKILL_BUILD_STAMP:START -->[\s\S]*?<!-- HEARTHQUEST_SKILL_BUILD_STAMP:END -->/;
    if (regex.test(text)) {
      text = text.replace(regex, stampBlock);
    } else {
      text = text.trimEnd() + `\n\n## Build Currency Stamp\n${stampBlock}\n`;
    }
    fs.writeFileSync(skillPath, text, "utf8");
  }
  return skillPaths.length;
}

function syncVersionFiles(manifest: VersionManifest): void {
  fs.writeFileSync(VERSION_JSON_PATH, JSON.stringify(manifest, null, 2) + "\n", "utf8");

  for (const pkgPath of PACKAGE_JSON_PATHS) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    pkg.version = manifest.version;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
  }

  let versionTs = fs.readFileSync(SHARED_VERSION_TS_PATH, "utf8");
  versionTs = versionTs
    .replace(/export const APP_VERSION = "[^"]+";/, `export const APP_VERSION = "${manifest.version}";`)
    .replace(/export const BUILD_NUMBER = \d+;/, `export const BUILD_NUMBER = ${manifest.buildNumber};`)
    .replace(/export const BUILD_UPDATED_AT = "[^"]+";/, `export const BUILD_UPDATED_AT = "${manifest.updatedAt}";`);
  fs.writeFileSync(SHARED_VERSION_TS_PATH, versionTs, "utf8");

  const updatedSkillsCount = syncSkillsBuildStamp(manifest);
  console.log(`[RELEASE] Synchronized ${updatedSkillsCount} workspace SKILL.md files to v${manifest.version} (#${manifest.buildNumber})`);
}

function verifyVersionConsistency(): VersionManifest {
  const manifest = readVersionManifest();

  for (const pkgPath of PACKAGE_JSON_PATHS) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    if (pkg.version !== manifest.version) {
      throw new Error(
        `Version mismatch in ${path.relative(ROOT_DIR, pkgPath)}: expected ${manifest.version}, found ${pkg.version}`
      );
    }
  }

  const versionTs = fs.readFileSync(SHARED_VERSION_TS_PATH, "utf8");
  if (!versionTs.includes(`export const APP_VERSION = "${manifest.version}";`)) {
    throw new Error(`packages/shared-types/src/version.ts APP_VERSION does not match ${manifest.version}`);
  }
  if (!versionTs.includes(`export const BUILD_NUMBER = ${manifest.buildNumber};`)) {
    throw new Error(`packages/shared-types/src/version.ts BUILD_NUMBER does not match ${manifest.buildNumber}`);
  }

  const skillPaths = collectHearthQuestSkillPaths();
  if (skillPaths.length < 9) {
    throw new Error(`Expected at least 9 HearthQuest SKILL.md files, found ${skillPaths.length}`);
  }
  for (const skillPath of skillPaths) {
    const content = fs.readFileSync(skillPath, "utf8");
    if (!content.includes(`\`v${manifest.version}\``) || !content.includes(`\`#${manifest.buildNumber}\``)) {
      throw new Error(
        `Skill file out of sync with build v${manifest.version} (#${manifest.buildNumber}): ${path.relative(ROOT_DIR, skillPath)}. Run npm run release:sync or npm run bump:patch.`
      );
    }
  }

  return manifest;
}

function main(): void {
  const args = process.argv.slice(2);
  const bumpArg = args.find((a) => a.startsWith("--bump="));

  if (bumpArg) {
    const mode = bumpArg.split("=")[1] as "patch" | "minor" | "major";
    if (!["patch", "minor", "major"].includes(mode)) {
      throw new Error(`Invalid --bump mode: ${mode}. Expected patch, minor, or major.`);
    }
    const current = readVersionManifest();
    const nextManifest: VersionManifest = {
      version: bumpSemver(current.version, mode),
      buildNumber: current.buildNumber + 1,
      defaultChannel: current.defaultChannel,
      updatedAt: new Date().toISOString(),
    };
    syncVersionFiles(nextManifest);
    console.log(
      `[RELEASE] Bumped HearthQuest version: v${current.version} (#${current.buildNumber}) -> v${nextManifest.version} (#${nextManifest.buildNumber})`
    );
  } else if (args.includes("--sync")) {
    const current = readVersionManifest();
    syncVersionFiles(current);
    console.log(`[RELEASE] Synchronized all workspace manifests to v${current.version} (#${current.buildNumber})`);
  }

  console.log("==========================================================");
  console.log("   HEARTHQUEST MANDATORY PRE-PUSH VERIFICATION GATE       ");
  console.log("==========================================================");

  // Step 1: Version & Build Number Consistency
  process.stdout.write("[GATE 1/3] Checking SemVer & Build Number consistency across all 6 manifests... ");
  const manifest = verifyVersionConsistency();
  console.log(`✅ v${manifest.version} (Build #${manifest.buildNumber})`);

  // Step 2: Workspace TypeScript Compiler Check
  process.stdout.write("[GATE 2/3] Running strict TypeScript check across all 5 workspaces... ");
  execSync("npm.cmd run typecheck", { cwd: ROOT_DIR, stdio: "pipe" });
  console.log("✅ 0 ERRORS");

  // Step 3: Full 9-Suite Functional & UI Badge Verification
  console.log("[GATE 3/3] Running full functional & UI build-badge verification suites...");
  execSync("npm.cmd run verify", { cwd: ROOT_DIR, stdio: "inherit" });

  console.log("\n==========================================================");
  console.log(`   🚀 PUSH GATE APPROVED: v${manifest.version} (Build #${manifest.buildNumber}) READY FOR DEV / BETA`);
  console.log("==========================================================");
}

main();
