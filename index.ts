import { App, Time } from "koishi";
import "koishi-adapter-onebot";
import * as PluginCommon from "koishi-plugin-common";
import { repeaterConfig } from "./src/repeaterConfig";
import * as MySql from "koishi-plugin-mysql";
import { PostPlugins } from "./src/postPlugins";
import * as puppeteer from "koishi-plugin-puppeteer";
import * as regexReplier from "./src/regexReplier";
import * as saveLoad from "./src/saveLoad";
import * as checkImage from "./src/checkImage";
import * as translator from "./src/translator";
import * as recalledMessage from "./src/recalledMessage";
import * as voice from "./src/voice";
import * as Teach from "koishi-plugin-teach";
import * as ImageSearch from "koishi-plugin-image-search";
import * as Schedule from "koishi-plugin-schedule";
import * as RSS from "koishi-plugin-rss";
import { config } from "./rabbot.config";
import { DailyCheckin } from "./src/dailyCheckin";
import { MazeRpg } from "./src/mazeRpg";

const { admin, selfId, secret, token, sqlUser, sqlPassword, server } = config;

const app = new App({
  type: "onebot:ws",
  server: server,
  selfId: selfId,
  token: token,
  prefix: ".",
  onebot: {
    secret: secret,
  },
  delay: {
    message: 0.5 * Time.second,
  },
  autoAssign: true,
  autoAuthorize: (sess) => (sess.userId === admin ? 4 : 1),
});

app.plugin(PluginCommon, {
  ...repeaterConfig,
});
app.plugin(MySql, {
  host: "127.0.0.1",
  port: 3306,
  user: sqlUser,
  password: sqlPassword,
  database: "koishi",
});
app.plugin(puppeteer, {
  browser: {
    defaultViewport: {
      width: 1024,
      height: 1024,
    },
  },
});
app.plugin(regexReplier);
app.plugin(saveLoad, { admins: [admin] });
app.plugin(checkImage);
app.plugin(translator);
app.plugin(recalledMessage);
app.plugin(voice, { admins: [admin], on: true });
app.plugin(Teach);
app.plugin(ImageSearch);
app.plugin(Schedule);
app.plugin(DailyCheckin);
app.plugin(RSS, {
  refresh: 30 * Time.minute
});
app.plugin(MazeRpg);

app.plugin(PostPlugins);

// 启动应用
app.start();
