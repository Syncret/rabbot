import { Context, segment } from "koishi-core";
import { getCQImageUrlFromMsg } from "./CQUtil";
import {
  PornTagStringMap,
  PornTags,
  PornTagType,
  tencentAIApis,
} from "./TencentAiApis";

export interface Options { }

function getResponseMessageAsync(
  imageUrl: string | undefined,
  options: Record<string, any>
): Promise<string> {
  if (!imageUrl) {
    return Promise.resolve("找不到图片呢");
  }
  return tencentAIApis
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
          .filter(([key, value]) => {
            if (value === 0 || key === PornTags.normal_hot_porn) {
              return false; // remove 0 values
            }
            if (
              tags.porn === 0 &&
              key !== PornTags.normal &&
              key !== PornTags.hot &&
              key !== PornTags.normal_hot_porn
            ) {
              return false; // remove porn subtags if porn is 0
            }
            return true;
          })
          .map(([key, value]) => {
            return `${PornTagStringMap[key as PornTagType]}: ${value}%`;
          })
          .join("\n");
        resMsg += "\n" + tagMsg;
      }
      return resMsg;
    })
    .catch((e) => {
      console.error(
        `visionPorn Error, Source Image: ${imageUrl}\n${e.message}`
      );
      return e.message + "";
    });
}

export function apply(ctx: Context, options: Options) {
  const keyword = "兔兔鉴黄";
  ctx.middleware(async (session, next) => {
    const msg = session.content;
    if (msg && (msg.startsWith(keyword) || msg.endsWith(keyword))) {
      const segs = segment.parse(msg);
      let imageUrl = "";
      for (let seg of segs) {
        if (seg.type === "quote") {
          const quoteMsg = await session.bot.getMessage(session.channelId!, seg.data.id);
          seg = segment.from(quoteMsg.content!);
        }
        if (seg.type === 'image') {
          imageUrl = seg.data.url;
        }
      }
      if (imageUrl) {
        return getResponseMessageAsync(imageUrl, {}).then((msg) => {
          if (msg) {
            session.send(msg);
          }
        });
      } else {
        return session.send("哪有图");
      }
    }
    return next();
  });
  ctx
    .command("judge <message:text>", "judge if an image is safe")
    .option("url", "-u <url:string>") // specify the url
    .option("detail", "-d") // view the detail result
    .action(({ session, options = {} }, message) => {
      if (!session) {
        return;
      }
      let imageUrl;
      if (options.url) {
        imageUrl = options.url;
      } else {
        imageUrl = getCQImageUrlFromMsg(message);
      }
      getResponseMessageAsync(imageUrl, options).then((msg) => {
        if (msg) {
          session.send(msg);
        }
      });
    });
}
export const name = "CheckPornImage";
