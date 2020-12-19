import { Context } from "koishi-core";
import { tencentAIApis } from "./TencentAiApis";
import { pickRandomly } from "./util";

export interface Options {
  admins?: number[];
  on?: boolean;
}

const inteval = 30 * 1000;
const getRecordMsg = (data: string) => `[CQ:record,file=base64://${data}]`;
export function apply(ctx: Context, options: Options = {}) {
  const admins = options.admins || [];
  let on = !!options.on;
  let nextTime = new Date().getTime();
  ctx.addMiddleware(async (meta, next) => {
    if (meta.message) {
      let msg = meta.message;
      if (msg.startsWith("兔兔说 ")) {
        msg = msg.substr(4).trim();
        if (!msg) {
          return;
        }
        if (!on) {
          return meta.$send!("兔兔这两天病了说不了话");
        }
        const time = Date.now();
        if (time < nextTime) {
          return meta.$send!(pickRandomly(["兔兔累了!", "让兔兔喝口水!"]));
        }
        nextTime = time + inteval;
        if (msg.length > 30) {
          return meta.$send!("太长了！不想念！");
        }
        return tencentAIApis
          .aaiTts(msg)
          .then((data) => {
            const res = getRecordMsg(data);
            meta.$send!(res);
          })
          .catch((e) => {
            meta.$send!(e.message);
          });
      }
    }
    return next();
  });
  ctx
    .command("voice <message...>", "say message in voice")
    .option("-p, --speaker <speaker>", "specify the speaker, 1/5/6/7")
    .option("-s, --speed <speed>", "specify the speed, [50, 200]")
    .option("-v, --volumn <volumn>", "specify the volumn, [-10, 10]")
    .option("-a, --aht <aht>", "specify the aht, [-24, 24]")
    .option("-g, --group <group>", "send the voice to group")
    .option("-o, --onoff <onoff>", "switch voice on or off")
    .action(({ meta, options = {} }, message) => {
      const userId = meta.userId || 0;
      if (!admins.includes(userId)) {
        meta.$send!("Not authorized");
        return;
      }
      if (options.onoff) {
        on = !on;
        meta.$send!(`Switch voice ${on ? "on" : "off"}`);
        return;
      }
      message = message.trim();
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
              ctx.sender.sendGroupMsgAsync(options.group, res);
            } else {
              meta.$send!(res);
            }
          })
          .catch((e) => {
            meta.$send!(e.message);
          });
      }
    });
}
