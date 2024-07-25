import { Context, Schema, Service } from 'koishi'
import axios, { AxiosInstance } from "axios";
import { AzureOpenAI } from "openai";
import { ChatCompletionMessageParam } from 'openai/resources/index.mjs';

declare module 'koishi' {
  interface Context {
    azureOpenAI: AzureOpenAIPlugin
  }
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

    let { banWordString = "", defaultSystemMessage = "", enableCommands } = this._options;
    let enabled = true;
    let queueAllMessages = true;
    let currentJobPromise: Promise<string> | undefined;
    let channelMessageCache: Record<string, string> = {};
    let channelSystemCache: Record<string, string | undefined> = {};
    const banWords = banWordString.split(",").map(i => i.trim());
    const channelMessageStatus: Record<string, boolean> = {};
    if (!enableCommands) { return; }
    ctx
      .command("chat <message:text>", "Talk with chatgpt")
      .option("new", "-n New conversation session (clean conversation history) (TODO: Long conversation not implemented)")
      .option("clean", "-c Clean conversations in all channels (TODO: Long conversation not not implemented)", { authority: 3 })
      .option("on", "-o Turn on/off chat", { authority: 3 })
      .option("queue", "-q Send message in queue or send concurrently", { authority: 3 })
      .option("system", "-s Set system message in current channel", { authority: 3 })
      .action(async ({ session, options = {} }, message) => {
        const channelId = session?.channelId;
        if (!channelId) {
          return "Invalid channelId";
        }
        if (options.on) {
          enabled = !enabled;
          return `Chat ${enabled ? "enabled" : "disabled"}`;
        }
        if (options.queue) {
          queueAllMessages = !queueAllMessages;
          return `Message queue ${queueAllMessages ? "enabled" : "disabled"}`;
        }
        if (options.clean) {
          channelMessageCache = {};
          return "Cleaned all conversations";
        }
        if (options.new) {
          delete channelMessageCache[channelId];
          if (!message) {
            return "New session started";
          }
        }
        if (message?.length > 1500) { // check this before you use message in system or user
          return "Message too long";
        }
        if (options.system) {
          channelSystemCache[channelId] = message || "";
          return `唔...我...${channelSystemCache[channelId]?.replace("你", "我").replace("请", "")}...`;
        }
        if (!enabled) {
          return "Sleeping...zzz";
        }
        if (!message) {
          return "";
        }
        channelMessageStatus[channelId] = true;
        if (queueAllMessages && currentJobPromise != null) {
          let lastAwaitJob: Promise<string> | undefined = undefined;
          while (lastAwaitJob !== currentJobPromise) {
            lastAwaitJob = currentJobPromise;
            await currentJobPromise;
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
    let { endpoint, apiKey, deployment } = this._options;
    const client = new AzureOpenAI({ apiKey, endpoint, deployment, apiVersion: "2024-05-01-preview" });

    try {
      const response = await client.chat.completions.create({
        messages,
        model: "",
        max_tokens: 800,
        stream: false,
        // temperature: 0.8,
        // top_p: 1.0,
        // presence_penalty: 1.0,
        // frequency_penalty: 0,
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
  public async dalle() {
    // TODO
  }
}

namespace AzureOpenAIPlugin {
  export interface Config {
    endpoint: string;
    apiKey: string;
    deployment: string;
    enableImageInChat: boolean;
    enableCommands: boolean;
    banWordString?: string;
    defaultSystemMessage?: string;
  }

  export const Config: Schema<Config> = Schema.object({
    endpoint: Schema.string().required().description("Azure OpenAI endpoint ({name}.openai.azure.com)"),
    apiKey: Schema.string().required().description("Azure OpenAI api key"),
    deployment: Schema.string().required().description("Deployment name"),
    enableImageInChat: Schema.boolean().default(false).description("Support image in chat (Need be a gpt-4o model) (Not tested in all adapter"),
    enableCommands: Schema.boolean().default(true).description("Enable commands (chat), if disabled, the plugin will only provide service"),
    banWordString: Schema.string().description("Sensitive words that you don't want to send to prevent your bot from being banned, sperated by ,"),
    defaultSystemMessage: Schema.string().description("Default system message for chat completion"),
  })
}

export default AzureOpenAIPlugin;
