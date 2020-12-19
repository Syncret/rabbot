import { Context } from "koishi-core";
import {
  CQCodeType,
  CQRegex,
  getCQImageUrlFromMsg,
  parseCQ,
  removeCQ,
} from "./CQUtil";
import {
  PornTagStringMap,
  PornTags,
  PornTagType,
  tencentAIApis,
  LanType,
  LanTypeStringMap,
  LanTypes,
} from "./TencentAiApis";
import { compareIgnoreCase } from "./util";

export interface Options {}
export const translatorKeywordRegex = /^兔兔(图片?像?里?)?(中|英|日|韩)?(?:文|语)?(翻?译?到?)(中|英|日|韩)?(?:文|语)?\S*/;

const lanMap: Record<string, LanType> = {
  中: "zh",
  英: "en",
  日: "jp",
  韩: "kr",
};
export async function translate(
  text: string,
  source?: LanType,
  target?: LanType
): Promise<string> {
  try {
    text = removeCQ(text);
    if (!text) {
      return "翻什么啦";
    }
    if (text.length > 1000) {
      return "太长不看！";
    }
    target = target || "zh";
    if (source === target) {
      return "这不是相同的语言吗！";
    }
    if (!source) {
      source = await tencentAIApis.nlpTextDetect(text);
      if (!source) {
        return "兔兔认不出这个语言...";
      }
    }
    if (source !== LanTypes.zh && target !== LanTypes.zh) {
      return "不会！";
    }
    if (source === target) {
      return `这看上去已经是${LanTypeStringMap[target]}了呢..`;
    }
    const res = await tencentAIApis.nlpTextTranslate(text, source, target);
    return res;
  } catch (e) {
    console.error(
      `translate Error, Source text: ${source},${target},${text}\n${e.message}`
    );
    return e.message + "";
  }
}
export async function translateImage(
  text: string,
  scene: "word" | "doc",
  source?: LanType,
  target?: LanType,
  detail?: boolean
): Promise<string> {
  const imageUrl = getCQImageUrlFromMsg(text);
  if (!imageUrl) {
    return "找不到图片...";
  }
  if (!source) {
    return "要翻啥语言呀";
  }
  target = target || "zh";
  if (source === target) {
    return "这不是相同的语言吗！";
  }
  if (source !== LanTypes.zh && target !== LanTypes.zh) {
    return "不会！";
  }
  const response = await tencentAIApis.nlpImageTranslate(
    imageUrl,
    scene,
    source,
    target
  );
  let result =
    response
      .map((item) => {
        if (detail) {
          return `x,y: [${item.x},${item.y}]; w,h:[${item.width},${item.height}]\n${item.source_text}\n${item.target_text}`;
        } else {
          return item.target_text;
        }
      })
      .join("\n") || "好像找不到文字诶";
  return result;
}
export function apply(ctx: Context, options: Options) {
  ctx.addMiddleware(async (meta, next) => {
    const rawMsg = meta.message || "";
    // /^兔兔(图片?像?里?)?(中|英|日|韩)?(?:文|语)?(翻?译?到?)(中|英|日|韩)?(?:文|语)?\S*/
    const matches = translatorKeywordRegex.exec(rawMsg);
    if (matches) {
      // "兔兔图片中文翻译英语 测试"=>[0"兔兔图片中文翻译英语",1"图片",2"中",3"翻译",4"英"]
      let source = lanMap[matches[2]];
      let target = lanMap[matches[4]];
      if (matches[1] && matches[3]) {
        // translate image
        return translateImage(rawMsg, "doc", source, target).then((msg) => {
          if (msg) {
            meta.$send!(msg);
          }
        });
      }
      if (matches[3] || (source && target)) {
        // valid command, 兔兔翻译|兔兔中日
        let tarMsg = rawMsg.substr(matches[0].length).trim();
        if (tarMsg) {
          return translate(tarMsg, source, target).then((msg) => {
            if (msg) {
              meta.$send!(msg);
            }
          });
        }
      }
    }

    return next();
  });

  ctx
    .command("translate <message...>", "translate message")
    .option(
      "-s, --source <source>",
      "specify source language, supported lans [zh, en, jp, kr]"
    )
    .option(
      "-t, --target <target>",
      "specify target language, supported lans [zh, en, jp, kr]"
    )
    .option("-i, --image", "translate image")
    .option("-d, --detail", "return image translate detail result")
    .option("-w, --word", "specify the scene to be word (default doc)")
    .action(({ meta, options }, message) => {
      const { source, target, image, detail, word } = options || {};
      if (image) {
        translateImage(
          message,
          word ? "word" : "doc",
          source,
          target,
          detail
        ).then((msg) => {
          if (msg) {
            meta.$send!(msg);
          }
        });
      } else {
        translate(message, source, target).then((msg) => {
          if (msg) {
            meta.$send!(msg);
          }
        });
      }
    });
}
