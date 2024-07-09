import { Context, Time } from "koishi-core";
import { safeGetRabbotField } from "./database";

export const name = "GensinHelper";
export function apply(ctx: Context) {
  const getFurnRecords = (timer: Record<string, number>) => {
    return Object.entries(timer).map(([key, value]) => {
      const leftTime = value - Date.now();
      if (leftTime <= 0) {
        delete timer[key];
        return "";
      } else {
        return `${key}: 剩余${(leftTime / Time.hour).toFixed(2)}小时;`;
      }
    }).filter((s) => !!s);
  }
  ctx
    .command("gensin/求加速", "家具加速请求")
    .option("time", "-t <time:number> 家具制作时间（单位小时，默认16)")
    .channelFields(["rabbot"])
    .action(({ session, options = {} }) => {
      const channel = session?.channel!;
      const time = options.time || 16;
      if (!(time > 0 && time < 40)) {
        return "无效时间";
      }
      const furTimer = safeGetRabbotField(channel, "gensinFurn");
      furTimer[session?.username!] = Date.now() + time * Time.hour;
      let msg = [`已记录请求，制作时间${time}小时。`];
      let msg2 = getFurnRecords(furTimer);
      if (msg2.length > 0) {
        msg.push(...msg2, `在等待家具制作的同时帮帮其他的群友吧~`);
      }
      return msg.join("\n");
    });
  ctx
    .command("gensin/加速 <name:string>", "加速某人请求")
    .channelFields(["rabbot"])
    .action(({ session, options = {} }, name) => {
      const furTimer = safeGetRabbotField(session?.channel!, "gensinFurn");
      if (name) {
        if (furTimer[name]) {
          const leftTime = furTimer[name] - 4 * Time.hour - Date.now();
          const pmsg = leftTime <= 0 ? "完成啦" : `还剩${(leftTime / Time.hour).toFixed(2)}小时`;
          delete furTimer[name];
          return `感谢你的加速呢！${name}的家具${pmsg}。`;
        } else {
          return "找不到对应群友的记录呢。"
        }
      }
      let msg = getFurnRecords(furTimer);
      if (msg.length > 0) {
        msg.unshift(`目前请求如下:`);
      } else {
        return `目前没有请求呢。`
      }
      return msg.join("\n");
    });
}
