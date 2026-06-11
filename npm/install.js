#!/usr/bin/env node
const {
  existsSync,
  mkdirSync,
  createWriteStream,
  chmodSync,
  readFileSync,
  writeFileSync,
  renameSync,
  unlinkSync,
  rmSync,
  readdirSync,
} = require("fs");
const { join, resolve } = require("path");
const https = require("https");
const http = require("http");
const { platform, arch } = process;
const { execSync } = require("child_process");

function detectPlatform() {
  const osMap = {
    linux: "linux",
    darwin: "darwin",
    win32: "win32",
  };
  const archMap = {
    x64: "x64",
    arm64: "arm64",
  };
  const os = osMap[platform];
  const cpu = archMap[arch];
  if (!os || !cpu) {
    console.error(`Unsupported platform: ${platform}-${arch}`);
    console.error("Please install from source: cargo install deepdeps");
    process.exit(1);
  }
  return `${os}-${cpu}`;
}

function getPlatformConfig(platformKey) {
  const configPath = join(__dirname, "platforms.json");
  const platforms = JSON.parse(readFileSync(configPath, "utf-8"));
  const cfg = platforms[platformKey];
  if (!cfg) {
    console.error(`No build available for ${platformKey}`);
    process.exit(1);
  }
  return cfg;
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    const protocol = url.startsWith("https") ? https : http;
    protocol
      .get(url, (response) => {
        if (
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          download(response.headers.location, dest).then(resolve).catch(reject);
          return;
        }
        if (response.statusCode !== 200) {
          reject(
            new Error(`Download failed with status ${response.statusCode}`),
          );
          return;
        }
        response.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      })
      .on("error", reject);
  });
}

async function install() {
  const binDir = join(__dirname, "bin");
  if (!existsSync(binDir)) mkdirSync(binDir, { recursive: true });

  const platformKey = detectPlatform();
  const config = getPlatformConfig(platformKey);
  const binaryName = platform === "win32" ? "deepdeps.exe" : "deepdeps";
  const binaryPath = join(binDir, binaryName);

  if (existsSync(binaryPath)) {
    console.log("deepdeps binary already installed");
    return;
  }

  console.log(`Downloading deepdeps for ${platformKey}...`);
  const archivePath = join(
    binDir,
    `deepdeps.${platform === "win32" ? "zip" : "tar.gz"}`,
  );

  try {
    await download(config.url, archivePath);
    console.log("Extracting...");
    const extractDir = join(binDir, "extract");
    if (!existsSync(extractDir)) mkdirSync(extractDir);

    if (platform === "win32") {
      execSync(
        `powershell -Command "Expand-Archive -Path '${archivePath}' -DestinationPath '${extractDir}' -Force"`,
        { stdio: "pipe" },
      );
    } else {
      execSync(`tar xzf "${archivePath}" -C "${extractDir}"`, {
        stdio: "pipe",
      });
    }

    const extractedBinary = join(extractDir, binaryName);
    if (existsSync(extractedBinary)) {
      renameSync(extractedBinary, binaryPath);
    } else {
      const files = readdirSync(extractDir);
      const bin = files.find((f) => f === binaryName || f.endsWith(binaryName));
      if (bin) {
        renameSync(join(extractDir, bin), binaryPath);
      }
    }

    chmodSync(binaryPath, 0o755);

    unlinkSync(archivePath);
    rmSync(extractDir, { recursive: true, force: true });

    console.log(`deepdeps installed successfully`);
  } catch (err) {
    console.error("Download failed:", err.message);
    console.log("Falling back to cargo install...");
    try {
      execSync(
        `cargo install --git https://github.com/Sqrilizz/deepdeps --tag v${require("./package.json").version}`,
        { stdio: "inherit" },
      );
      // Copy the cargo-installed binary to our bin dir
      const cargoBin = `/usr/local/cargo/bin/${binaryName}`;
      if (existsSync(cargoBin)) {
        renameSync(cargoBin, binaryPath);
      }
      console.log("deepdeps installed successfully via cargo");
    } catch (cargoErr) {
      console.error("cargo install also failed:", cargoErr.message);
      console.error(
        "Please install manually: cargo install --git https://github.com/Sqrilizz/deepdeps",
      );
      process.exit(1);
    }
  }
}

install();
