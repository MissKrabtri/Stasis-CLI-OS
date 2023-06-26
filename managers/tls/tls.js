const { spawn } = require("child_process");
const path = require("path");
const getPort = require("get-port");
const got = require("got");
const { getHWID } = require("hwid");

let PORT = "";
const launchTLS = async () => {
  PORT = await getPort();
  global.tlsPort = PORT;
  let hwid = await getHWID();
  let tlsProcess = spawn(getPath(), {
    env: { PORT: PORT.toString(), HWID: hwid },
    windowsHide: true,
    detached: process.platform !== "win32",
    stdio: "ignore",
  });
  tlsProcess.unref();
  process.on("SIGINT", () => {
    tlsProcess.kill("SIGINT");
  });
  process.on("SIGTERM", () => {
    tlsProcess.kill("SIGINT");
  });
  process.on("exit", () => {
    tlsProcess.kill("SIGINT");
  });
  tlsProcess.on("error", (err) => {
    console.error("Failed to start subprocess:", err);
  });
};

const getPath = () => {
  if (process.platform === "win32") {
    return path.join(process.cwd(), "external", "TLS.exe");
  }
};

const handleTLS = async (options) => {
  let response = await got(
    `http://localhost:${global.tlsPort || PORT}`,
    options
  );
  return response;
};

module.exports = {
  handleTLS,
  launchTLS,
};
