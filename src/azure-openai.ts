import axios, { AxiosInstance } from "axios";
import { Context } from "koishi-core";
import { banWords } from "../rabbot.config";

export interface Options {
  resourceName: string;
  accessKey: string;
  banWords: string[];
}
const defaultCompletionParams = {
  temperature: 0.8,
  top_p: 1.0,
  presence_penalty: 1.0,
  frequency_penalty: 0,
  max_tokens: 800,
}
export const name = "AzureOpenAI";
export async function apply(ctx: Context, options: Options) {
  let { resourceName, accessKey } = options;
  let enabled = true;
  let queueAllMessages = true;
  let currentJobPromise: Promise<string> | undefined;
  let channelMessageCache: Record<string, string> = {};
  let channelSystemCache: Record<string, string | undefined> = {};
  const channelMessageStatus: Record<string, boolean> = {};
  const axiosClient: AxiosInstance = axios.create({
    baseURL: `https://${resourceName}.openai.azure.com/openai/deployments/gpt35/chat/completions`,
    params: {
      "api-version": "2023-03-15-preview",
    },
    headers: {
      "api-key": accessKey,
    },
    timeout: 5 * 60 * 1000
  });
  ctx
    .command("chat <message:text>", "Talk with chatgpt")
    .option("new", "-n Create a new session")
    .option("clean", "-c Clean all conversations", { hidden: true, authority: 3 })
    .option("on", "-o Turn on/off chat", { hidden: true, authority: 3 })
    .option("queue", "-q Queue messages of all channels", { hidden: true, authority: 3 })
    .option("system", "-s Set system message", { hidden: true, authority: 3 })
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
          const systemInstruction = channelSystemCache[channelId];
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
      if(result){
        for(const banWord of banWords){
          if(result.toLowerCase().includes(banWord.toLowerCase())){
            result=`检测到危险词语，不能说呢..`;
            break;
          }
        }
      }
      return result;
    });
}
