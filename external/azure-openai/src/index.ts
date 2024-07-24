import { Context, Schema, Service } from 'koishi'
import axios, { AxiosInstance } from "axios";
import { AzureOpenAI } from "openai";
import { ChatCompletionMessageParam } from 'openai/resources/index.mjs';

declare module 'koishi' {
  interface Context {
    azureOpenAI: AzureOpenAIPlugin
  }
}

const defaultCompletionParams = {
  temperature: 0.8,
  top_p: 1.0,
  presence_penalty: 1.0,
  frequency_penalty: 0,
  max_tokens: 800,
}

class AzureOpenAIPlugin extends Service {
  constructor(ctx: Context, private _options: AzureOpenAIPlugin.Config) {
    super(ctx, 'azureOpenAI');

    if (this._options.endpoint.endsWith("/")) {
      this._options.endpoint = this._options.endpoint.slice(0, -1);
    }
    if (!this._options.endpoint.startsWith("https://")) {
      this._options.endpoint = "https://" + this._options.endpoint;
    }

    let { endpoint, apiKey, deployment, banWordString = "", defaultSystemMessage = "" } = this._options;
    let enabled = true;
    let queueAllMessages = true;
    let currentJobPromise: Promise<string> | undefined;
    let channelMessageCache: Record<string, string> = {};
    let channelSystemCache: Record<string, string | undefined> = {};
    const banWords = banWordString.split(",").map(i => i.trim());
    const channelMessageStatus: Record<string, boolean> = {};
    /**
    if (!chatDeploymentUrl.startsWith("https://")) {
      chatDeploymentUrl = `https://${chatDeploymentUrl}`;
    }
    if (!chatDeploymentUrl.endsWith("/")) {
      chatDeploymentUrl += "/";
    }
    const axiosClient: AxiosInstance = axios.create({
      baseURL: `${chatDeploymentUrl}chat/completions`,
      params: {
        "api-version": "2024-04-01-preview" ,
      },
      headers: {
        "api-key": apiKey,
      },
      timeout: 5 * 60 * 1000
    });
     */
    ctx
      .command("chat <message:text>", "Talk with chatgpt")
      .option("new", "-n Create a new session")
      .option("clean", "-c Clean all conversations", { authority: 3 })
      .option("on", "-o Turn on/off chat", { authority: 3 })
      .option("queue", "-q Queue messages of all channels", { authority: 3 })
      .option("system", "-s Set system message", { authority: 3 })
      .action(async ({ session, options = {} }, message) => {
        const channelId = session?.channelId;
        if (!channelId) {
          return "Invalid channelId";
        }
        if (options.on) {
          enabled = !enabled;
          return `聊天功能已${enabled ? "开启" : "关闭"}`;
        }
        if (options.queue) {
          queueAllMessages = !queueAllMessages;
          return `消息队列已${queueAllMessages ? "开启" : "关闭"}`;
        }
        if (options.clean) {
          channelMessageCache = {};
          return "所有对话历史已清理";
        }
        if (options.new) {
          delete channelMessageCache[channelId];
          if (!message) {
            return "对话历史已清理";
          }
        }
        if (message?.length > 1500) { // check this before you use message in system or user
          return "消息太长啦";
        }
        if (options.system) {
          channelSystemCache[channelId] = message || "";
          return `唔...我...${channelSystemCache[channelId]?.replace("你", "我")}...`;
        }
        if (!enabled) {
          return "兔兔的脑细胞烧完了，聊天功能暂停中...";
        }
        // const chatStatus = channelMessageStatus[channelId];
        // if (chatStatus) {
        //   return "还在回复上一条消息";
        // }
        if (!message) {
          return "你什么都没说呢";
        }
        channelMessageStatus[channelId] = true;
        if (queueAllMessages && currentJobPromise != null) {
          let lastAwaitJob: Promise<string> | undefined = undefined;
          while (lastAwaitJob !== currentJobPromise) {
            lastAwaitJob = currentJobPromise;
            await currentJobPromise;
            if (lastAwaitJob !== currentJobPromise) {
              console.log(`${channelId} waits again`);
            }
          }
        }
        const sendMessage = async () => {
          try {
            const messages: ChatCompletionMessageParam[] = [{ role: "user", content: message }];
            const systemInstruction = channelSystemCache[channelId] ?? defaultSystemMessage;
            if (systemInstruction) {
              messages.unshift({ role: "system", content: systemInstruction });
            }
            return await this.chatCompletion(messages);
          } catch (e) {
            console.log(e);
            return e + "";
          }
        };
        const messagePromise = sendMessage();
        currentJobPromise = messagePromise;
        let result = await messagePromise;
        channelMessageStatus[channelId] = false;
        if (result) {
          for (const banWord of banWords) {
            if (result.toLowerCase().includes(banWord.toLowerCase())) {
              result = `检测到危险词语，不能说呢..`;
              break;
            }
          }
        }
        return result;
      });
  }
  /**
   * Azure OpenAI Dalle service has 2 concurrent requests limit, so all requests will be queued by default
   */
  public async chatCompletion(messages: ChatCompletionMessageParam[]) {
    let { endpoint, apiKey, deployment, banWordString = "", defaultSystemMessage = "" } = this._options;
    const client = new AzureOpenAI({ apiKey, endpoint, deployment, apiVersion: "2024-05-01-preview" });

    try {
      const response = await client.chat.completions.create({
        messages,
        model: "",
        max_tokens: 128,
        stream: false,
      });
      const responseMessage = response.choices?.[0]?.message;
      const content = responseMessage?.content;
      return content?.trim() ?? responseMessage ?? response.choices ?? response;
    } catch (e) {
      let errorMessage = e.toString();
      // content got filtered
      const filterResult: Record<string, { filtered: boolean, severity: string }> = e.error?.innererror?.content_filter_result;
      if (filterResult) {
        const filterReason = Object.entries(filterResult).filter(([_, value]) => { return value?.filtered }).map(([key, value]) => `${value.severity} ${key}`);
        if (filterReason.length > 0) {
          errorMessage = `Content filtered due to ${filterReason.join(", ")}.`;
        }
        return errorMessage;
      }
    }
  }
  /**
   * Azure OpenAI Dalle service has 2 concurrent requests limit, so all requests will be queued by default
   */
  public dalle() {

  }
}

namespace AzureOpenAIPlugin {
  export interface Config {
    endpoint: string;
    apiKey: string;
    deployment: string;
    banWordString?: string;
    defaultSystemMessage?: string;
  }

  export const Config: Schema<Config> = Schema.object({
    endpoint: Schema.string().required().description("Azure OpenAI endpoint ({name}.openai.azure.com)"),
    apiKey: Schema.string().required().description("Azure OpenAI api key"),
    deployment: Schema.string().required().description("Deployment name"),
    banWordString: Schema.string().description("Sensitive words that you don't want to respond"),
    defaultSystemMessage: Schema.string().description("Default system message"),
  })
}

export default AzureOpenAIPlugin;
