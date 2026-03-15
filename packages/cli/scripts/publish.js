const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const cliDir = path.resolve(__dirname, "..");
const distDir = path.join(cliDir, "dist");

// Clean and create dist directory
fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

// Create a publish-ready package.json with the npm package name
const pkg = JSON.parse(fs.readFileSync(path.join(cliDir, "package.json"), "utf-8"));
pkg.name = "react-compiler-marker";
delete pkg.scripts;
fs.writeFileSync(path.join(distDir, "package.json"), JSON.stringify(pkg, null, 2) + "\n");

// Copy publishable files
for (const entry of pkg.files || []) {
  const src = path.join(cliDir, entry);
  if (fs.existsSync(src)) {
    fs.cpSync(src, path.join(distDir, entry), { recursive: true });
  }
}

// Publish from dist (pass through any extra args like --provenance)
const args = process.argv.slice(2).join(" ");
execSync(`npm publish ${args}`, { cwd: distDir, stdio: "inherit" });

// Clean up
fs.rmSync(distDir, { recursive: true, force: true });
