import { Context, Time } from "koishi-core";
import "database";
import { safeGetRabbotField } from "./database";


export const name = "GensinHelper";
export function apply(ctx: Context) {
  const getFurnRecords = (timer: Record<string, number>) => {
    return Object.entries(timer).map(([key, value]) => {
      const leftTime = (value - Date.now());
      if (leftTime <= 0) {
        delete timer[key];
        return "";
      } else {
        return `${key}: 剩余时间${(leftTime / Time.hour).toFixed(2)}小时;`;
      }
    }).filter((s) => !!s);
  }
  ctx
    .command("gensin/求加速", "家具加速请求")
    .option("time", "-t <time:number> 家具制作时间（单位小时，默认16)")
    .channelFields(["rabbot"])
    .action(({ session, options = {} }) => {
      const time = options.time || 16;
      if (!(time > 0 && time < 40)) {
        return "无效时间";
      }
      const furTimer = safeGetRabbotField(session?.channel!, "gensinFurn");
      furTimer[session?.username!] = Date.now() + time * Time.hour;
      let msg = [`已记录请求，制作时间${time}小时。目前请求如下:`];
      msg.concat(getFurnRecords(furTimer));
      msg.push(`在等待家具制作的同时帮帮其他的群友吧~`)
      return msg.join("\n");
    });
  ctx
    .command("gensin/加速 <name:string>", "加速某人请求")
    .channelFields(["rabbot"])
    .action(({ session, options = {} }, name) => {
      const furTimer = safeGetRabbotField(session?.channel!, "gensinFurn");
      if (name) {
        if (furTimer[name]) {
          delete furTimer[name];
          return "感谢你的加速呢！";
        } else {
          return "找不到对应群友的记录呢。"
        }
      }
      let msg = [`目前请求如下:`];
      msg.concat(getFurnRecords(furTimer));
      return msg.join("\n");
    });
}
