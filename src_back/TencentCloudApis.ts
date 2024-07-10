import * as tencentcloud from "tencentcloud-sdk-nodejs";
import { ClientConfig } from "tencentcloud-sdk-nodejs/tencentcloud/common/interface";
import { ItemValue } from "tencentcloud-sdk-nodejs/tencentcloud/services/tmt/v20180321/tmt_models";
import { TencentCloudKey } from "./apiKey.config";
import { GenerateUUIDV4, getUrlContentInBase64 } from "./util";

if (!(TencentCloudKey.secretId && TencentCloudKey.secretKey)) {
  console.warn("TencentCloudClient not initialized.");
}

const clientConfig: ClientConfig = {
  credential: {
    secretId: TencentCloudKey.secretId,
    secretKey: TencentCloudKey.secretKey,
  },
  // 产品地域
  region: "ap-shanghai",
  // 可选配置实例
  profile: {
    signMethod: "HmacSHA256", // 签名方法
    httpProfile: {
      reqMethod: "POST", // 请求方法
      // reqTimeout: 30, // 请求超时时间，默认60s
    },
  },
};

class TencentCloudApis {
  private _tmt = new tencentcloud.tmt.v20180321.Client(clientConfig);
  private _projectId = TencentCloudKey.projectId;
  constructor() {}

  public async textTranslate(
    text: string,
    source: string,
    target: string
  ): Promise<string> {
    let error: string | undefined;
    let result: string | undefined;
    await this._tmt.TextTranslate(
      {
        SourceText: text,
        Source: source,
        Target: target,
        ProjectId: this._projectId,
      },
      (innerError, rep) => {
        error = innerError;
        result = rep.TargetText;
      }
    );
    if (error) {
      throw error;
    } else {
      return result || "";
    }
  }

  public async imageTranslate(
    imageUrl: string,
    source: string,
    target: string
  ) {
    const imageRes = await getUrlContentInBase64(imageUrl, {
      maxContentLength: 1000 * 1000,
    });
    if (!imageRes.type.startsWith("image")) {
      throw Error("Not an image, content-type: " + imageRes.type);
    }

    let error: string | undefined;
    let result: Array<ItemValue> | undefined;
    const sessionId = GenerateUUIDV4();
    await this._tmt.ImageTranslate(
      {
        SessionUuid: sessionId,
        Scene: "doc",
        Data: imageRes.data,
        Source: source,
        Target: target,
        ProjectId: this._projectId,
      },
      (innerError, rep) => {
        error = innerError;
        result = rep?.ImageRecord?.Value;
      }
    );
    if (error) {
      throw error;
    } else {
      return result || [];
    }
  }
}

export const tencentCloudApis = new TencentCloudApis();
