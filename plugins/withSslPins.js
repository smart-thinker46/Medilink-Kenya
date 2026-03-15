const fs = require("fs");
const path = require("path");
const {
  withDangerousMod,
  withXcodeProject,
  IOSConfig,
} = require("@expo/config-plugins");

const sanitizeCertName = (name) =>
  String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_");

const getCertNames = (config) => {
  const raw =
    process.env.EXPO_PUBLIC_SSL_PINNING_CERTS ||
    config?.extra?.sslPinningCerts ||
    "";
  return String(raw || "")
    .split(",")
    .map((item) => sanitizeCertName(item))
    .filter(Boolean);
};

const withSslPins = (config) => {
  const certNames = getCertNames(config);
  if (!certNames.length) {
    return config;
  }

  const projectRoot = config.modRequest?.projectRoot || process.cwd();
  const certsDir = path.join(projectRoot, "assets", "certs");

  const certFiles = certNames.map((name) => ({
    name,
    file: `${name}.cer`,
    source: path.join(certsDir, `${name}.cer`),
  }));

  certFiles.forEach(({ source }) => {
    if (!fs.existsSync(source)) {
      throw new Error(
        `SSL pinning certificate not found: ${source}. Place .cer files in assets/certs.`,
      );
    }
  });

  config = withDangerousMod(config, [
    "android",
    async (config) => {
      const androidRes = path.join(
        config.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "res",
        "raw",
      );
      if (!fs.existsSync(androidRes)) {
        fs.mkdirSync(androidRes, { recursive: true });
      }
      certFiles.forEach(({ file, source }) => {
        fs.copyFileSync(source, path.join(androidRes, file));
      });
      return config;
    },
  ]);

  config = withDangerousMod(config, [
    "ios",
    async (config) => {
      const iosCertDir = path.join(
        config.modRequest.platformProjectRoot,
        "ssl-certs",
      );
      if (!fs.existsSync(iosCertDir)) {
        fs.mkdirSync(iosCertDir, { recursive: true });
      }
      certFiles.forEach(({ file, source }) => {
        fs.copyFileSync(source, path.join(iosCertDir, file));
      });
      return config;
    },
  ]);

  config = withXcodeProject(config, (config) => {
    const projectRoot = config.modRequest.platformProjectRoot;
    certFiles.forEach(({ file }) => {
      const filePath = `ssl-certs/${file}`;
      const addResource =
        IOSConfig?.XcodeUtils?.addResourceFileToGroup ||
        IOSConfig?.XcodeProjectFile?.addResourceFileToGroup;
      if (typeof addResource === "function") {
        addResource({
          filepath: filePath,
          groupName: "ssl-certs",
          project: config.modResults,
        });
      }
    });
    return config;
  });

  return config;
};

module.exports = withSslPins;
