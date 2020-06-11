import { Context } from "koishi-core";
import { String2TimeInterval, timeUnitInMillis, timeUnit } from "./util";

interface cachedMessage {
  expireTime: number;
  message: string;
  autoDelete: boolean;
}

const messageCache = new Map<string, cachedMessage>();

export function apply(ctx: Context) {
  ctx
    .command("save <message...>", "save message")
    .option("-t, --time", "specify the expire time(sample: 7d8h)")
    .option("-e, --echo", "echo message body (for test)")
    .option("-k, --keep", "keep the message instead of auto delete")
    .option("-l, --list", "list all cached message")
    .option("-c, --clear", "clear all the message")
    .action(({ meta, options }, message) => {
      if (meta.messageType !== "private") {
        return; // only support in private message
      }
      let responseMessage: string = "Completed";
      let response: Promise<void | void[]> = Promise.resolve();
      if (options.echo) {
        response = response.then(() => meta.$send(message, true));
      }
      if (options.list) {
        Array.from(messageCache.entries())
          .map(
            ([index, value]) =>
              `Id:${index}; Expire:${new Date(
                value.expireTime
              ).toLocaleString()}; AutoDelete: ${value.autoDelete}`
          )
          .join("\n");
      } else if (options.clear) {
        messageCache.clear();
      } else if (!message) {
        responseMessage = "Please enter a message";
      } else {
        const autoDelete = !options.keep;
        const timeInterval = options.time || "1d";
        let timeIndex = new Date().getTime();
        const timeIndexString = timeIndex.toString();
        const interval = String2TimeInterval(timeInterval);
        const expireTime = timeIndex + interval;
        while (messageCache.has(timeIndexString)) {
          timeIndex++;
        }
        messageCache.set(timeIndexString, {
          expireTime,
          message,
          autoDelete,
        });
        const expireTimeString = new Date(expireTime).toLocaleString();
        responseMessage = `消息已保存，私聊兔兔${timeIndex}查看，有效期至${expireTimeString}`;
      }
      response
        .then(() => meta.$send(responseMessage))
        .catch((e) => meta.$send(e));
    });

  ctx.receiver.on("message", (meta) => {
    if (meta.messageType !== "private") {
      return;
    }
    if (messageCache.has(meta.message)) {
      const cacheContent = messageCache.get(meta.message);
      ctx.sender
        .sendPrivateMsg(meta.userId, cacheContent.message)
        .then((messageId) => {
          if (messageId && cacheContent.autoDelete) {
            setTimeout(() => {
              ctx.sender.deleteMsgAsync(messageId);
            }, timeUnitInMillis[timeUnit.minute]);
          }
        });
    }
  });

  setInterval(() => {
    const curTime = new Date().getTime();
    Array.from(messageCache.entries()).forEach(([id, value]) => {
      if(curTime>=value.expireTime){
        messageCache.delete(id);
      }
    });
  }, timeUnitInMillis[timeUnit.hour]);
}
