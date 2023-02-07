const name = "ChatGPT";
async function apply(ctx, options) {
  const { apiKey } = options;
  const chatgpt = await import('chatgpt');
  const api = new chatgpt.ChatGPTAPI({
    apiKey
  });
  const defaultMessageOptions = {
    timeoutMs: 2 * 60 * 1000
  };
  const channelMessageCache = {};
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
      const res = await api.sendMessage(message, previousMessage && !options.new ? {
        ...defaultMessageOptions,
        conversationId: previousMessage.conversationId,
        parentMessageId: previousMessage.id
      } : defaultMessageOptions);
      channelMessageCache[channelId] = res;
      return res.text;
    });
}

exports.apply = apply;
exports.name = name;