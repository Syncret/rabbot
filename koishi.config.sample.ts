import { AppConfig, Time } from "koishi";
import "koishi-adapter-onebot";
import { repeaterConfig } from "./src/repeaterConfig";
import { config as rabbotConfig } from "./rabbot.config";

const { admin, selfId, secret, token, sqlUser, sqlPassword, server } = rabbotConfig;


const config: AppConfig = {
  port: 44443,
  onebot: {
    secret: secret,
  },
  bots: [
    {
      type: "onebot:ws",
      server: server,
      selfId: selfId,
      token: token,
    },
  ],
  prefix: ".",
  delay: {
    message: Time.second,
  },
  autoAssign: true,
  autoAuthorize: (sess) => (sess.userId === admin ? 4 : 0),
  plugins: {
    // official plugins
    common: {
      ...repeaterConfig([]),
    },
    mysql: {
      host: "127.0.0.1",
      port: 3306,
      user: sqlUser,
      password: sqlPassword,
      database: "koishi",
    },
    "puppeteer": {
      browser: {
        defaultViewport: {
          width: 1024,
          height: 1024,
        },
      },
    },
    "rss": {
      refresh: 30 * Time.minute
    },
    "teach": {},
    "image-search": {},
    "schedule": {},
    "webui": {},

    "./src/regexReplier": {},
    "./src/saveLoad": { admins: [admin] },
    "./src/checkImage": {},
    "./src/translator": {},
    "./src/requestRedirector": { admin: admin },
    "./src/recalledMessage": {},
    "./src/voice": { admins: [admin], on: true },
    "./src/mazeRPG": {},

    "./src/postPlugins": {},
    // dice: {},
    // github: {},
    // tools: {},
    // webui: {},
  },
};

export = config;
