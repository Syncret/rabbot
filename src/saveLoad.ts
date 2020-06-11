import { Context } from "koishi-core";
import { String2TimeInterval, timeUnitInMillis, timeUnit } from "./util";

interface cachedMessage {
  expireTime: number;
  message: string;
  autoDelete: boolean;
}
const messageCache = new Map<string, cachedMessage>();

export interface Options {
  admins?: number[];
}

export function apply(ctx: Context, options: Options) {
  const { admins = [] } = options;
  ctx
    .command("save <message...>", "save message")
    .option("-t, --time <time>", "specify the expire time(sample: 7d8h)")
    .option("-e, --echo", "echo message body (for test)")
    .option("-k, --keep", "keep the message instead of auto delete")
    .option("-l, --list", "list all cached message")
    .option("-c, --clear", "clear all the message")
    .action(({ meta, options }, message) => {
      let responseMessage: string = "Completed";
      let response: Promise<void | void[]> = Promise.resolve();
      if (options.echo) {
        response = response.then(() => meta.$send(message, true));
      }
      const isAdmin = admins.includes(meta.userId);
      if (options.list) {
        if (isAdmin) {
          responseMessage = Array.from(messageCache.entries())
            .map(
              ([index, value]) =>
                `Id:${index}; Expire:${new Date(
                  value.expireTime
                ).toLocaleString()}; AutoDelete: ${value.autoDelete}`
            )
            .join("\n");
        }
      } else if (options.clear) {
        if (isAdmin) {
          messageCache.clear();
        }
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
      if (curTime >= value.expireTime) {
        messageCache.delete(id);
      }
    });
  }, timeUnitInMillis[timeUnit.hour]);
}
