import { Context } from "koishi-core";
import { getCQImageUrlFromMsg, removeCQ } from "./CQUtil";
import { tencentCloudApis } from "./TencentCloudApis";

export interface Options {}
export const translatorKeywordRegex = /^兔兔(图片整?段?落?)?(?:(.+?)[文|语])?([翻|译|到]+)(?:(.+?)[文|语])?\S*/;

const lanMap: Record<string, string> = {
  中: "zh",
  繁体中: "zh-TW",
  英: "en",
  日: "ja",
  韩: "ko",
  法: "fr",
  西班牙: "es",
  意大利: "it",
  德: "de",
  土耳其: "tr",
  俄: "ru",
  葡萄牙: "pt",
  越南: "vi",
  印尼: "id",
  泰: "th",
  马来西亚: "ms",
  阿拉伯: "ar",
  印地: "hi",
};
export async function translate(
  text: string,
  source?: string,
  target?: string
): Promise<string> {
  try {
    text = removeCQ(text);
    if (!text) {
      return "翻什么啦";
    }
    if (text.length >= 2000) {
      return `太长不看！有${text.length}个字诶！`;
    }
    source = source || "auto";
    if (source === "zh" && !target) {
      return "想翻什么语言嘛";
    }
    if (source === target) {
      return "这不是相同的语言吗！";
    }
    target = target || "zh";
    const res = await tencentCloudApis.textTranslate(text, source, target);
    return res;
  } catch (e) {
    console.error(`Translate Error: ${e}\n${source},${target},${text}`);
    return e + "";
  }
}
export async function translateImage(
  text: string,
  source?: string,
  target?: string,
  detail?: boolean,
  concat?: boolean
): Promise<string> {
  const imageUrl = getCQImageUrlFromMsg(text);
  if (!imageUrl) {
    return "找不到图片...";
  }
  source = source || "auto";
  if (source === "zh" && !target) {
    return "想翻什么语言嘛";
  }
  if (source === target) {
    return "这不是相同的语言吗！";
  }
  target = target || "zh";
  const response = await tencentCloudApis.imageTranslate(
    imageUrl,
    source,
    target
  );
  let result = "";
  if (!concat) {
    result = response
      .map((item) => {
        if (detail) {
          return `x,y: [${item.X},${item.Y}]; w,h:[${item.W},${item.H}]\n${item.SourceText}\n${item.TargetText}`;
        } else {
          return item.TargetText;
        }
      })
      .join("\n");
  } else {
    const concatSourceText = response.map((i) => i.SourceText).join(" ");
    if (detail) {
      result = concatSourceText + "\n\n";
    }
    result += await translate(concatSourceText, source, target);
  }
  return result || "好像找不到文字诶";
}
export function apply(ctx: Context) {
  ctx.middleware(async (session, next) => {
    const rawMsg = session.content || "";
    // /^兔兔(图片整?段?落?)?(?:(.+?)[文|语])?([翻|译|到]+)(?:(.+?)[文|语])?\S*/;
    const matches = translatorKeywordRegex.exec(rawMsg);
    if (matches) {
      // "兔兔图片中文翻译英语 测试"=>[0"兔兔图片中文翻译英语",1"图片",2"中",3"翻译",4"英"]
      let source = lanMap[matches[2]];
      let target = lanMap[matches[4]];
      if ((matches[2] && !source) || (matches[4] && !target)) {
        return session.send("谁懂那种语言啦！！");
      }
      if (matches[1] && matches[3]) {
        // 1图片，3翻译
        // translate image
        return translateImage(
          rawMsg,
          source,
          target,
          false,
          matches[1].includes("段")
        ).then((msg) => {
          if (msg) {
            session.send(msg);
          }
        });
      }
      if (matches[3] || (source && target)) {
        // valid command, 兔兔翻译|兔兔中日
        let tarMsg = rawMsg.substr(matches[0].length).trim();
        if (tarMsg) {
          return translate(tarMsg, source, target).then((msg) => {
            if (msg) {
              session.send(msg);
            }
          });
        }
      }
    }

    return next();
  });

  ctx
    .command("translate <message:text>", "translate message")
    .option("source", "-s <source>") // specify source language, supported lans [zh, en, jp, kr]
    .option("target", "-t <target>") // specify target language, supported lans [zh, en, jp, kr]
    .option("image", "-i") // translate image
    .option("concat", "-c") // concat text in source image
    .option("detail", "-d") // return image translate detail result
    .action(({ session, options = {} }, message) => {
      if (!session) {
        return;
      }
      const { source, target, image, concat, detail } = options;
      if (image) {
        translateImage(message, source, target, detail, concat).then((msg) => {
          if (msg) {
            session.send(msg);
          }
        });
      } else {
        translate(message, source, target).then((msg) => {
          if (msg) {
            session.send(msg);
          }
        });
      }
    });
}
