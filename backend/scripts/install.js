#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const {
  InstallerError,
  runInstaller,
} = require("../src/services/install.service");

const printHelp = () => {
  console.log(`Usage:
  node backend/scripts/install.js --config backend/scripts/install.config.json --reset

Options:
  --config <path>  Path to installer JSON config file
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
  if (!configPath) {
    throw new InstallerError(
      "Config file is required. Use --config backend/scripts/install.config.json",
    );
  }

  const resolvedPath = path.resolve(process.cwd(), configPath);

  if (!fs.existsSync(resolvedPath)) {
    throw new InstallerError(`Config file not found: ${resolvedPath}`);
  }

  try {
    return JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
  } catch (error) {
    throw new InstallerError(`Config file is not valid JSON: ${error.message}`);
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
