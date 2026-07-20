#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const {
  InstallerError,
  runInstaller,
} = require("../src/services/install.service");

const configRoot = fs.realpathSync(__dirname);
const MAX_CONFIG_FILE_SIZE = 64 * 1024;
const CONFIG_ARGUMENT_PATTERN =
  /^(?:(?:backend\/)?scripts\/)?([A-Za-z0-9][A-Za-z0-9._-]{0,99}\.json)$/;

const isPathInside = (root, candidate) => {
  const relativePath = path.relative(root, candidate);
  return (
    Boolean(relativePath) &&
    relativePath !== ".." &&
    !relativePath.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relativePath)
  );
};

const printHelp = () => {
  console.log(`Usage:
  node backend/scripts/install.js --config backend/scripts/install.config.json --reset

Options:
  --config <file>  JSON filename under backend/scripts
  --reset          Drop and recreate installer-managed tables before import
  --no-reset       Import schema without dropping existing installer-managed tables
  --help           Show this help message`);
};

const parseArgs = (argv) => {
  const parsed = {
    configPath: null,
    resetDatabase: undefined,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
      continue;
    }

    if (arg === "--reset") {
      parsed.resetDatabase = true;
      continue;
    }

    if (arg === "--no-reset") {
      parsed.resetDatabase = false;
      continue;
    }

    if (arg === "--config") {
      parsed.configPath = argv[index + 1];
      index += 1;
      continue;
    }

    throw new InstallerError(`Unknown installer option: ${arg}`);
  }

  return parsed;
};

const readConfig = (configPath) => {
  if (typeof configPath !== "string" || !configPath.trim()) {
    throw new InstallerError(
      "Config file is required. Use --config backend/scripts/install.config.json",
    );
  }

  const normalizedArgument = configPath.trim().replace(/\\/g, "/");
  const argumentMatch = CONFIG_ARGUMENT_PATTERN.exec(normalizedArgument);

  if (!argumentMatch) {
    throw new InstallerError(
      "Config file must be a JSON file inside backend/scripts",
    );
  }

  const resolvedPath = path.join(configRoot, argumentMatch[1]);

  let fileStats;

  try {
    fileStats = fs.lstatSync(resolvedPath);
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new InstallerError("Config file was not found");
    }
    throw new InstallerError("Config file could not be inspected");
  }

  if (
    !fileStats.isFile() ||
    fileStats.isSymbolicLink() ||
    fileStats.size > MAX_CONFIG_FILE_SIZE
  ) {
    throw new InstallerError(
      "Config must be a regular JSON file no larger than 64 KB",
    );
  }

  const canonicalPath = fs.realpathSync(resolvedPath);
  if (!isPathInside(configRoot, canonicalPath)) {
    throw new InstallerError("Config file must remain inside backend/scripts");
  }

  try {
    return JSON.parse(fs.readFileSync(canonicalPath, "utf8"));
  } catch {
    throw new InstallerError("Config file is not valid JSON");
  }
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  const config = readConfig(args.configPath);

  if (args.resetDatabase !== undefined) {
    config.reset_database = args.resetDatabase;
  }

  const result = await runInstaller(config);
  console.log(result.message);
};

if (require.main === module) {
  main().catch((error) => {
    if (error instanceof InstallerError) {
      console.error(error.message);

      if (error.details) {
        console.error(JSON.stringify(error.details, null, 2));
      }
    } else {
      console.error("Installation failed");
      console.error(error.message);
    }

    process.exitCode = 1;
  });
}

module.exports = { parseArgs, readConfig };
