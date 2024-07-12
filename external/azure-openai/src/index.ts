import { Context, Schema } from 'koishi'
import axios, { AxiosInstance } from "axios";

export const name = 'azure-openai'

export interface Config {
  chatDeploymentUrl: string;
  accessKey: string;
  banWordString?: string;
  defaultSystemMessage?: string;
}

export const Config: Schema<Config> = Schema.object({
  chatDeploymentUrl: Schema.string().required().description("Azure OpenAI model deployment url"),
  accessKey: Schema.string().required().description("Azure OpenAI access key"),
  banWordString: Schema.string().description("Sensitive words that you don't want to respond"),
  defaultSystemMessage: Schema.string().description("Default system message"),
})

const defaultCompletionParams = {
  temperature: 0.8,
  top_p: 1.0,
  presence_penalty: 1.0,
  frequency_penalty: 0,
  max_tokens: 800,
}
export async function apply(ctx: Context, options: Config) {
  let { chatDeploymentUrl, accessKey, banWordString = "", defaultSystemMessage = "" } = options;
  let enabled = true;
  let queueAllMessages = true;
  let currentJobPromise: Promise<string> | undefined;
  let channelMessageCache: Record<string, string> = {};
  let channelSystemCache: Record<string, string | undefined> = {};
  const banWords = banWordString.split(",").map(i => i.trim());
  const channelMessageStatus: Record<string, boolean> = {};
  if (!chatDeploymentUrl.startsWith("https://")) {
    chatDeploymentUrl = `https://${chatDeploymentUrl}`;
  }
  if (!chatDeploymentUrl.endsWith("/")) {
    chatDeploymentUrl += "/";
  }
  const axiosClient: AxiosInstance = axios.create({
    baseURL: `${chatDeploymentUrl}chat/completions`,
    params: {
      "api-version": "2024-04-01-preview",
    },
    headers: {
      "api-key": accessKey,
    },
    timeout: 5 * 60 * 1000
  });
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
          const messages = [{ role: "user", content: message }];
          const systemInstruction = channelSystemCache[channelId] ?? "" + defaultSystemMessage;
          if (systemInstruction) {
            messages.unshift({ role: "system", content: systemInstruction });
          }
          const response = await axiosClient.post("", {
            ...defaultCompletionParams,
            messages
          })
          const responseMessage = response.data?.choices?.[0]?.message;
          const content = responseMessage?.content as string;
          return content?.trim() ?? responseMessage ?? response.data?.choices ?? response.data;
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
