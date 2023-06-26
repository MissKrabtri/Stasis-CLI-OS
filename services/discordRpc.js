const RPC = require("discord-rpc");
const { version } = require("../package.json");

module.exports = class discordRPC {
  constructor() {
    this.startTime = new Date();
    this.duration = 60 * 1000;
  }

  async launchRPC() {
    try {
      this.rpc = new RPC.Client({
        transport: "ipc",
      });
      this.rpc.on("ready", () => {
        this.setActivity();
      });

      await this.rpc.login({
        clientId: "1103384718155722928",
      });
    } catch (e) {
      global.logThis(
        `[Discord RPC]: ---> ${e.message} (Failed to connect to Discord)`,
        "warn"
      );
    }
  }

  async setActivity() {
    try {
      let phrases = [
        "Stasis CLI",
        "@StasisCLI",
        "NFTs | Retail | Food Deals | Generators",
        "@Stasis_Labs",
      ];
      await this.rpc.setActivity({
        details: `Version ${version}`,
        state: phrases[Math.floor(Math.random() * phrases.length)],
        largeImageKey: "untitled-1",
        largeImageText: "Stasis CLI",
        startTimestamp: this.startTime,
      });
    } catch (e) {
      console.log(e.message);
    } finally {
      this.timeout = setTimeout(() => {
        this.setActivity();
      }, this.duration);
    }
  }
};
