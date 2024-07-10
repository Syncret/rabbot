const name = "ChatGPT";
const ApiReverseProxyUrl = {
  duti: undefined,
  pawan: "https://gpt.pawan.krd/backend-api/conversation"
}
async function apply(ctx, options) {
  let { accessToken } = options;
  let enabled = true;
  let queueAllMessages = true;
  let currentJobPromise;
  let channelMessageCache = {};
  const channelMessageStatus = {};
  let currentProxyUrl = ApiReverseProxyUrl.duti;
  const chatgpt = await import('chatgpt');
  const createApi = () => {
    channelMessageCache = {};
    return new chatgpt.ChatGPTUnofficialProxyAPI({
      accessToken,
      apiReverseProxyUrl: currentProxyUrl
    })
  }
  let api = createApi();
  const defaultMessageOptions = {
    timeoutMs: 3 * 60 * 1000
  };
  ctx
    .command("chat", "Talk with chatgpt")
    .option("new", "-n Create a new session")
    .option("clean", "-c Clean all conversations", { hidden: true, authority: 3 })
    .option("on", "-o Turn on/off chat", { hidden: true, authority: 3 })
    .option("queue", "-q Queue messages of all channels", { hidden: true, authority: 3 })
    .option("proxy", "-p Switch api reverse proxy url", { hidden: true, authority: 3 })
    .option("token", "-t Update access token", { hidden: true, authority: 3 })
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
      if (options.proxy) {
        currentProxyUrl = currentProxyUrl === ApiReverseProxyUrl.duti ? ApiReverseProxyUrl.pawan : ApiReverseProxyUrl.duti;
        api = createApi();
        return `代理地址已切换至${currentProxyUrl}`;
      }
      if (options.token) {
        if (message) {
          accessToken = message;
          api = createApi();
          return `Access token已更新`;
        } else {
          return `无效Access token`;
        }
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
      if (!enabled) {
        return "兔兔的脑细胞烧完了，聊天功能暂停中...";
      }
      const previousMessage = channelMessageCache[channelId];
      const chatStatus = channelMessageStatus[channelId];
      if (chatStatus) {
        return "还在回复上一条消息";
      }
      if (!message) {
        return "你什么都没说呢";
      }
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
        try {
          const res = await api.sendMessage(message, previousMessage ? {
            ...defaultMessageOptions,
            conversationId: previousMessage.conversationId,
            parentMessageId: previousMessage.id
          } : defaultMessageOptions);
          channelMessageCache[channelId] = res;
          return res.text ? res.text : JSON.stringify(res);
        } catch (e) {
          return e + "";
        }
      };
      const messagePromise = sendMessage();
      currentJobPromise = messagePromise;
      const result = await messagePromise;
      channelMessageStatus[channelId] = false;
      return result;
    });
}

exports.apply = apply;
exports.name = name;