import axios, { AxiosInstance } from "axios";
import { Context } from "koishi-core";

export interface Options {
  resourceName: string;
  accessKey: string;
}
const defaultCompletionParams = {
  temperature: 0.8,
  top_p: 1.0,
  presence_penalty: 1.0,
  frequency_penalty: 0,
  max_tokens: 800,
}
export const name = "AzureOpenAI-Translate";
export async function apply(ctx: Context, options: Options) {
  let { resourceName, accessKey } = options;
  let enabled = true;
  const messagePlaceHolder = "$message";
  let defaultPrompt = `Translate below paragraph into Chinese: """${messagePlaceHolder}"""`;
  const axiosClient: AxiosInstance = axios.create({
    baseURL: `https://${resourceName}.openai.azure.com/openai/deployments/gpt35/chat/completions`,
    params: {
      "api-version": "2023-03-15-preview",
    },
    headers: {
      "api-key": accessKey,
    },
  });
  ctx
    .command("translate <message:text>", "Translate with chatgpt")
    .alias("翻译")
    .option("on", "-o Turn on/off", { hidden: true, authority: 3 })
    .option("prompt", "-p Set prompt message", { hidden: true, authority: 3 })
    .action(async ({ session, options = {} }, message) => {
      const channelId = session?.channelId;
      if (!channelId) {
        return "Invalid channelId";
      }
      if (message?.length > 1000) { // check this before you use message in system or user
        return "唔，文字太长了...";
      }
      if (options.on) {
        enabled = !enabled;
        return `功能已${enabled ? "开启" : "关闭"}`;
      }
      if (!enabled) {
        return "兔兔的脑细胞烧完了，翻译功能暂停中...";
      }
      if (!message) {
        return "你什么都没说呢";
      }
      if (options.prompt) {
        defaultPrompt = message;
        return "Prompt已更新"
      }
      try {
        message = defaultPrompt.replace(messagePlaceHolder, message);
        const messages = [{ role: "user", content: message }];
        const response = await axiosClient.post("", {
          ...defaultCompletionParams,
          messages
        })
        const responseMessage = response.data?.choices?.[0]?.message;
        const content = responseMessage?.content as string;
        return content?.trim() ?? responseMessage ?? response.data?.choices ?? response.data;
      } catch (e) {
        return e + "";
      } 
    });
}
