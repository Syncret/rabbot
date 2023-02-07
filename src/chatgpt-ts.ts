import { ChatMessage, SendMessageOptions } from "chatgpt";
import { Context } from "koishi-core";

export interface Options {
  apiKey: string;
}

export const name = "ChatGPT";
export async function apply(ctx: Context, options: Options) {
  const { apiKey } = options;
  const chatgpt = await import('chatgpt');
  const api = new chatgpt.ChatGPTAPI({
    apiKey
  });
  const defaultMessageOptions: SendMessageOptions = {
    timeoutMs: 2 * 60 * 1000
  };
  const channelMessageCache: Record<string, ChatMessage> = {};
  const channelMessageStatus: Record<string, boolean> = {};
  ctx
    .command("chat", "Talk with chatgpt")
    .option("new", "-n Create a new session")
    .option("channelId", "-c Get channel Id", { hidden: true })
    .action(async ({ session, options = {} }, message) => {
      const channelId = session?.channelId;
      if (!channelId) {
        return "Invalid channelId";
      }
      if (options.channelId) {
        return channelId;
      }
      if (!message) {
        return "你什么都没说呢";
      }
      const previousMessage = channelMessageCache[channelId];
      const chatStatus = channelMessageStatus[channelId];
      if (chatStatus) {
        return "还在回复上一条消息";
      }
      try {
        channelMessageStatus[channelId] = true;
        const res = await api.sendMessage(message, previousMessage && !options.new ? {
          ...defaultMessageOptions,
          conversationId: previousMessage.conversationId,
          parentMessageId: previousMessage.id
        } : defaultMessageOptions);
        channelMessageCache[channelId] = res;
        return res.text;
      } catch (e) {
        return e + "";
      } finally {
        channelMessageStatus[channelId] = false;
      }
    });
}
