import { Context } from "koishi-core";
import {
  tencentAIApis,
} from "./TencentAiApis";

export interface Options {}

export function apply(ctx: Context) {
  ctx.addMiddleware((meta, next) => {
    return next();
  });
  ctx
    .command("voice <message...>", "say message in voice")
    .option("-p, --speaker <speaker>", "specify the speaker, 1/5/6/7")
    .option("-s, --speed <speed>", "specify the speed, [50, 200]")
    .option("-v, --volumn <volumn>", "specify the volumn, [-10, 10]")
    .option("-a, --aht <aht>", "specify the aht, [-24, 24]")
    .action(({ meta, options = {} }, message) => {
      message = message.trim();
      if (message) {
        if(message.length>30){
          message="太长了！不想念";
        }
        tencentAIApis
          .aaiTts(message, {
            speaker: options.speaker || undefined,
            speed: options.speed || undefined,
            volume: options.volume || undefined,
            aht: options.aht || undefined,
          })
          .then((data) => {
            const res = `[CQ:record,file=base64://${data}]`;
            meta.$send!(res);
          })
          .catch((e) => {
            meta.$send!(e.message);
          });
      }
    });
}
