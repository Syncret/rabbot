const name = "ChatGPT";
async function apply(ctx, options) {
  const { accessToken } = options;
  const chatgpt = await import('chatgpt');
  const api = new chatgpt.ChatGPTUnofficialProxyAPI({
    accessToken,
    apiReverseProxyUrl: "https://chat.duti.tech/api/conversation"
  });
  const defaultMessageOptions = {
    timeoutMs: 2 * 60 * 1000
  };
  let enabled = true;
  let queueAllMessages = true;
  let currentJobPromise;
  const channelMessageCache = {};
  const channelMessageStatus = {};
  ctx
    .command("chat", "Talk with chatgpt")
    .option("new", "-n Create a new session")
    .option("channelId", "-c Get channel Id", { hidden: true })
    .option("on", "-o Turn on/off chat", { hidden: true, authority: 3 })
    .option("queue", "-q Queue messages of all channels", { hidden: true, authority: 3 })
    .action(async ({ session, options = {} }, message) => {
      const channelId = session?.channelId;
      if (!channelId) {
        return "Invalid channelId";
      }
      if (options.channelId) {
        return channelId;
      }
      if (options.on) {
        enabled = !enabled;
        return `聊天功能已${enabled ? "开启" : "关闭"}`;
      }
      if (options.queue) {
        queueAllMessages = !queueAllMessages;
        return `消息队列已${queueAllMessages ? "开启" : "关闭"}`;
      }
      if (!enabled) {
        return "兔兔的零花钱烧完了，聊天功能暂停中...";
      }
      if (!message) {
        if (options.new) {
          delete channelMessageCache[channelId];
          return "对话历史已清理";
        } else {
          return "你什么都没说呢";
        }
      }
      const previousMessage = channelMessageCache[channelId];
      const chatStatus = channelMessageStatus[channelId];
      if (chatStatus) {
        return "还在回复上一条消息";
      }
      try {
        channelMessageStatus[channelId] = true;
        if (queueAllMessages && currentJobPromise != null) {
          let lastAwaitJob = undefined;
          while (lastAwaitJob !== currentJobPromise) {
            lastAwaitJob = currentJobPromise;
            await currentJobPromise;
            if (lastAwaitJob !== currentJobPromise) {
              console.log(`${channelId} waits again`);
            }
          }
        }
        const sendMessage = async () => {
          const res = await api.sendMessage(message, previousMessage && !options.new ? {
            ...defaultMessageOptions,
            conversationId: previousMessage.conversationId,
            parentMessageId: previousMessage.id
          } : defaultMessageOptions);
          channelMessageCache[channelId] = res;
          return res.text ? res.text : JSON.stringify(res);
        };
        const messagePromise = sendMessage();
        currentJobPromise = messagePromise;
        const result = await messagePromise;
        return result;
      } catch (e) {
        currentJobPromise = undefined;
        return e + "";
      } finally {
        channelMessageStatus[channelId] = false;
      }
    });
}

exports.apply = apply;
exports.name = name;