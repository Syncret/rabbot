import Axios, { AxiosRequestConfig } from "axios";
import { TencentAi } from "./apiKey.config";
import * as crypto from "crypto-js";
import { getEnumFromObjectKeys } from "./util";

export interface TecentAIVisionPornResponse {
  ret: number;
  msg: string;
  data: {
    tag_list: PornTag[];
  };
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

function getReqBody(param: Record<string, any>, sort?: boolean) {
  // 1. 字典升序排序
  let keys = Object.keys(param);
  if (sort) {
    keys.sort();
  }
  // 2. 拼按URL键值对
  let result: string[] = [];
  for (const key of keys) {
    const value = param[key];
    if (value) {
      result.push(key + "=" + encodeURIComponent(value));
    }
  }
  return result.join("&");
}

function getReqSign(param: Record<string, any>, appkey: string) {
  let result = getReqBody(param, true);
  // 3. 拼接app_key
  result += "&app_key=" + appkey;
  // 4. MD5运算+转换大写，得到请求签名
  result = crypto.MD5(result).toString().toUpperCase();
  return result;
}

const axiosURLconfig: AxiosRequestConfig = {
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
  },
  timeout: 10000,
};

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
    
    const response = await Axios.post<TecentAIVisionPornResponse>(
      // "https://api.ai.qq.com/fcgi-bin/vision/vision_porn",
      // getReqBody(payload),
      "https://ai.qq.com/cgi-bin/appdemo_imageporn?g_tk=837557226",
      getReqBody({ image_url: imageUrl }),
      axiosURLconfig
    );
    if (response.status === 200) {
      const responseData = response.data as TecentAIVisionPornResponse;
      if (responseData.ret === 0) {
        const tagList = responseData.data.tag_list || [];
        const result: Partial<Record<PornTagType, number>> = {};
        tagList.forEach((tag) => {
          result[tag.tag_name] = tag.tag_confidence;
        });
        return result;
      } else {
        throw Error(responseData.ret + ":" + responseData.msg);
      }
    } else {
      console.warn(response.status + JSON.stringify(response.data));
    }
  }

  private _createRequestPayload(data: Record<string, any>) {
    const payload: Record<string, any> = {
      app_id: this._appid,
      time_stamp: Math.floor(new Date().getTime() / 1000),
      nonce_str: ("" + Math.random()).substr(2),
      ...data,
    };
    payload.sign = getReqSign(payload, this._appkey);
    return payload;
  }
}

export const tencentAIApis = new TencentAIApis();
