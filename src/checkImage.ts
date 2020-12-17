import { Context } from "koishi-core";
import { CQCodeType, parseCQ } from "./CQUtil";
import { PornTags, tencentAIApis } from "./TencentAiApis";
import { compareIgnoreCase } from "./util";

export interface Options {}

export function apply(ctx: Context, options: Options) {
  ctx
    .command("judge <message...>", "judge if an image is safe")
    .option("-u, --url <url>", "specify the url")
    .option("-d, --detail", "view the detail result")
    .action(({ meta, options }, message) => {
      let imageUrl = "";
      if (options.url) {
        imageUrl = options.url;
      } else {
        const CQs = parseCQ(message);
        const sampleCode = CQs[0];
        if (
          !compareIgnoreCase(sampleCode && sampleCode.type, CQCodeType.image)
        ) {
          meta.$send("找不到图片呢");
          return;
        }
        imageUrl = sampleCode.attributes.url;
      }
      if (!imageUrl) {
        meta.$send("找不到url呢");
      }
      tencentAIApis
        .visionPorn(imageUrl)
        .then((tags) => {
          let resMsg = "";
          if (tags.porn > 83) {
            resMsg = "太瑟情啦！赶紧撤回！";
          } else if (tags.porn > 50) {
            resMsg = "感觉好黄暴！";
          } else if (tags.hot > 80) {
            resMsg = "好色哦！";
          } else if (tags.hot > tags.normal) {
            resMsg = "好像是一张色图的样子！";
          } else if (tags.normal > 90) {
            resMsg = "完全safe呢！";
          } else if (tags.normal > 70) {
            resMsg = "看起来还蛮健全的嘛...";
          } else {
            resMsg = "有点微妙的感觉...";
          }
          resMsg = resMsg + ` 综合瑟琴指数: ${tags.normal_hot_porn}`;

          if (options.detail) {
            const tagMsg = Object.entries(tags)
              .filter(([key, value]) => value > 0)
              .map(([key, value]) => {
                return `${PornTags[key]}: ${value}%`;
              })
              .join("\n");
            resMsg += "\n" + tagMsg;
          }
          meta.$send(resMsg);
        })
        .catch((e) => {
          meta.$send(e.message);
          console.warn(e);
        });
    });
}
