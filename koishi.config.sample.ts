import { AppConfig, Time } from "koishi";
import "koishi-adapter-onebot";

const admin = "";
const selfId = "";
const secret = "";
const token = "";

const config: AppConfig = {
  // port: 6700,
  onebot: {
    secret: secret,
  },
  bots: [
    {
      type: "onebot:ws",
      server: "ws://localhost:6705",
      selfId: selfId,
      token: token,
    },
  ],
  plugins: {
    common: {},
    // "./src/testReceiver": {},
    "./src/regexReplier": {},
    "./src/requestRedirector": { admin: admin },
    "./src/messageRedirector": { admins: [admin] },
    "./src/saveLoad": { admins: [admin] },
    "./src/checkImage": {},
    "./src/translator": {},
    "./src/voice": { admins: [admin], on: true },
  },
  delay: {
    message: 0.5 * Time.second,
  },
  prefix: "#",
};

export = config;
