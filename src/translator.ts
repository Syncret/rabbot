import { Context } from "koishi-core";
import { CQCodeType, CQRegex, parseCQ } from "./CQUtil";
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

const lanMap: Record<string, LanType> = {
  中: "zh",
  英: "en",
  日: "jp",
  韩: "kr",
};
export async function translate(
  text: string,
  sourLan?: LanType,
  destLan?: LanType
): Promise<string> {
  try {
    if (!text) {
      return "翻什么啦";
    }
    if (text.length > 1000) {
      return "太长不看！";
    }
    destLan = destLan || "zh";
    if(sourLan === destLan){
      return "这不是相同的语言吗！"
    }
    if (!sourLan) {
      sourLan = await tencentAIApis.nlpTextDetect(text);
      if(!sourLan){
        return "兔兔认不出这个语言...";
      }
    }
    if (sourLan !== LanTypes.zh && destLan !== LanTypes.zh) {
      return "不会！";
    }
    if (sourLan === destLan) {
      return `这看上去已经是${LanTypeStringMap[destLan]}了呢..`;
    }
    const res = await tencentAIApis.nlpTextTranslate(text, sourLan, destLan);
    return res;
  } catch (e) {
    console.error(e);
    return e.message + "";
  }
}
export function apply(ctx: Context, options: Options) {
  ctx.addMiddleware(async (meta, next) => {
    const rawMsg = meta.message;
    const matches = /^兔兔(中|英|日|韩)?(?:文|语)?(翻?译?到?)(中|英|日|韩)?(?:文|语)?\S*/.exec(
      rawMsg
    );
    if (matches) {
      let sourLan = lanMap[matches[1]];
      let destLan = lanMap[matches[3]];
      if (matches[2] || (sourLan && destLan)) {
        // valid command, 兔兔翻译|兔兔中日
        let tarMsg = rawMsg.substr(matches[0].length).trim();
        tarMsg = tarMsg.replace(CQRegex, "");
        if (tarMsg) {
          return translate(tarMsg, sourLan, destLan).then((msg) => {
            if (msg) {
              meta.$send(msg);
            }
          });
        }
      }
    }

    return next();
  });
}
