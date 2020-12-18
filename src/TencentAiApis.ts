import Axios, { AxiosRequestConfig } from "axios";
import { TencentAi } from "./apiKey.config";
import * as crypto from "crypto-js";
import { getEnumFromObjectKeys, getUrlContentInBase64 } from "./util";

export interface TecentAIResponse<T> {
  ret: number;
  msg: string;
  data: T;
}

export interface TecentAIResponseVisionPornData {
  tag_list: PornTag[];
}

export interface PornTag {
  tag_confidence: number;
  tag_confidence_f: number;
  tag_name: PornTagType;
}

export const PornTagStringMap = {
  normal: "正常",
  hot: "性感",
  porn: "黄色图像",
  "female-genital": "女性阴部",
  "female-breast": "女性胸部",
  "male-genital": "男性阴部",
  pubes: "阴毛",
  anus: "肛门",
  sex: "性行为",
  normal_hot_porn: "图像为色情的综合值",
};
export const PornTags = getEnumFromObjectKeys(PornTagStringMap);
export type PornTagType = keyof typeof PornTagStringMap;

export const LanTypeStringMap = {
  zh: "中文",
  en: "英文",
  jp: "日文",
  kr: "韩文",
};
export const LanTypes = getEnumFromObjectKeys(LanTypeStringMap);
export type LanType = keyof typeof LanTypeStringMap;
export interface TecentAIResponseNlpTextDetectData {
  lang: LanType;
}
export interface TecentAIResponseNlpTextTranslateData {
  source_text: string;
  target_text: string;
}
export interface TecentAIResponseNlpImageTranslateData {
  session_id: string;
  image_records: {
    source_text: string;
    target_text: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }[];
}

function getReqBody(param: Record<string, any>, sort?: boolean) {
  // 1. 字典升序排序
  let keys = Object.keys(param);
  if (sort) {
    keys.sort();
  }
  // 2. 拼按URL键值对
  let result = new URLSearchParams();
  for (const key of keys) {
    const value = param[key];
    if (value) {
      result.append(key, value);
    }
  }
  return result.toString();
}

function getReqSign(param: Record<string, any>, appkey: string) {
  let result = getReqBody(param, true);
  // 3. 拼接app_key
  result += "&app_key=" + appkey;
  // 4. MD5运算+转换大写，得到请求签名
  result = crypto.MD5(result).toString().toUpperCase();
  return result;
}

const axiosConfig: AxiosRequestConfig = {
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
  },
  timeout: 10000,
};

function getRandomString(): string {
  return ("" + Math.random()).substr(2);
}

class TencentAIApis {
  private _appid: string;
  private _appkey: string;
  private _authorized = false;
  constructor() {
    this._appid = TencentAi.appid;
    this._appkey = TencentAi.appkey;
    if (this._appid && this._appkey) {
      this._authorized = true;
    }
  }

  public authorize(): void {
    if (!this._authorized) {
      throw "没有apikey!";
    }
  }

  public async visionPorn(imageUrl: string) {
    this.authorize();
    const payload = this._createRequestPayload({ image_url: imageUrl });

    const responseData = await this._sendRequest<TecentAIResponseVisionPornData>(
      // "https://api.ai.qq.com/fcgi-bin/vision/vision_porn",
      // payload,
      "https://ai.qq.com/cgi-bin/appdemo_imageporn?g_tk=837557226",
      { image_url: imageUrl }
    );
    const tagList = responseData.tag_list || [];
    const result: Partial<Record<PornTagType, number>> = {};
    tagList.forEach((tag) => {
      result[tag.tag_name] = tag.tag_confidence;
    });
    return result as Record<PornTagType, number>;
  }

  public async nlpTextDetect(text: string) {
    this.authorize();
    const payload = this._createRequestPayload({ text, force: "0" });
    const responseData = await this._sendRequest<TecentAIResponseNlpTextDetectData>(
      "https://api.ai.qq.com/fcgi-bin/nlp/nlp_textdetect",
      payload
    );
    return responseData.lang;
  }

  public async nlpTextTranslate(
    text: string,
    source: LanType,
    target: LanType
  ) {
    this.authorize();
    const payload = this._createRequestPayload({ text, source, target });
    const responseData = await this._sendRequest<TecentAIResponseNlpTextTranslateData>(
      "https://api.ai.qq.com/fcgi-bin/nlp/nlp_texttranslate",
      payload
    );
    return responseData.target_text;
  }

  public async nlpImageTranslate(
    imageUrl: string,
    scene: "word" | "doc",
    source: LanType,
    target: LanType
  ) {
    this.authorize();
    const imageRes = await getUrlContentInBase64(imageUrl);
    if (!imageRes.type.startsWith("image")) {
      throw Error("Not an image, content-type: " + imageRes.type);
    }
    const payload = this._createRequestPayload({
      image: imageRes.data,
      session_id: getRandomString(),
      scene,
      source,
      target,
    });

    const responseData = await this._sendRequest<TecentAIResponseNlpImageTranslateData>(
      "https://api.ai.qq.com/fcgi-bin/nlp/nlp_imagetranslate",
      payload
    );
    const records = responseData.image_records;
    return records;
  }

  private async _sendRequest<T>(
    url: string,
    payload: Record<string, any>
  ): Promise<T> {
    const response = await Axios.post<TecentAIResponse<T>>(
      url,
      getReqBody(payload),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: 10000,
      }
    );
    if (response.status === 200) {
      const responseData = response.data;
      if (responseData.ret === 0) {
        return responseData.data;
      } else {
        throw Error(
          "Api Error: " +
            responseData.ret +
            ", " +
            responseData.msg +
            "\n" +
            JSON.stringify(payload)
        );
      }
    } else {
      throw Error(
        "Http Error: " + response.status + ", " + response.statusText
      );
    }
  }

  private _createRequestPayload(data: Record<string, any>) {
    const payload: Record<string, any> = {
      app_id: this._appid,
      time_stamp: Math.floor(new Date().getTime() / 1000),
      nonce_str: getRandomString(),
      ...data,
    };
    payload.sign = getReqSign(payload, this._appkey);
    return payload;
  }
}

export const tencentAIApis = new TencentAIApis();
