import { Context } from "koishi-core";
import { removeCQ } from "./CQUtil";
import { tencentAIApis } from "./TencentAiApis";
import { pickRandomly } from "./util";

export interface Options {
  admins?: string[];
  on?: boolean;
}

const inteval = 30 * 1000;
const getRecordMsg = (data: string) => `[CQ:record,file=base64://${data}]`;
export function apply(ctx: Context, options: Options = {}) {
  const admins = options.admins || [];
  let on = !!options.on;
  let nextTime = new Date().getTime();
  ctx.middleware(async (session, next) => {
    if (session.content) {
      let msg = session.content;
      if (msg.startsWith("兔兔说 ")) {
        msg = removeCQ(msg.substr(4)).trim();
        if (!msg) {
          return;
        }
        if (!on) {
          return session.send("兔兔这两天病了说不了话");
        }
        const time = Date.now();
        if (time < nextTime) {
          return session.send(pickRandomly(["兔兔累了!", "让兔兔喝口水!"]));
        }
        nextTime = time + inteval;
        if (msg.length > 30) {
          return session.send("太长了！不想念！");
        }
        return tencentAIApis
          .aaiTts(msg)
          .then((data) => {
            const res = getRecordMsg(data);
            session.send(res);
          })
          .catch((e) => {
            session.send(e.message);
          });
      }
    }
    return next();
  });
  ctx
    .command("voice <message:text>", "say message in voice")
    .option("speaker", "-p <speaker>") // specify the speaker, 1/5/6/7
    .option("speed", "-s <speed>") // specify the speed, [50, 200]
    .option("volume", "-v <volume>") // specify the volumn, [-10, 10]
    .option("aht", "-a <aht>") // specify the aht, [-24, 24]
    .option("group", "-g <group>") // send the voice to group
    .option("onoff", "-o <onoff>") // switch voice on or off
    .action(({ session, options = {} }, message) => {
      if (!session) {
        return;
      }
      const userId = session.userId || "";
      if (!admins.includes(userId)) {
        session.send("Not authorized");
        return;
      }
      if (options.onoff) {
        on = !on;
        session.send(`Switch voice ${on ? "on" : "off"}`);
        return;
      }
      message = removeCQ(message).trim();
      if (message) {
        if (message.length > 100) {
          message = "太长了！不想念";
        }
        tencentAIApis
          .aaiTts(message, {
            speaker: options.speaker || undefined,
            speed: options.speed || undefined,
            volume: options.volume || undefined,
            aht: options.aht || undefined,
          })
          .then((data) => {
            const res = getRecordMsg(data);
            if (options.group) {
              session.bot.sendGroupMessage(options.group, res);
            } else {
              session.send(res);
            }
          })
          .catch((e) => {
            session.send(e.message);
          });
      }
    });
}
