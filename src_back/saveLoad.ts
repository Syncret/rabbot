import { segment, Session } from "koishi";
import { Context } from "koishi-core";
import { String2TimeInterval, timeUnitInMillis, timeUnit } from "./util";

interface cachedMessage {
  expireTime: number;
  message: string;
  autoDelete: boolean;
}
const messageCache = new Map<string, cachedMessage>();

async function saveMessage(session: Session, message: string, options: { keep?: boolean, time?: string }): Promise<string> {
  let responseMessage = "";
  if (!message) {
    session?.sendQueued("找不到内容，请输入需保存的消息:");
    message = await session?.prompt(30 * 1000);
  }
  if (!message) {
    return "找不到消息呢。"
  }
  const autoDelete = !options.keep;
  let timeIndex = new Date().getTime();
  const timeIndexString = timeIndex.toString();
  let interval = timeUnitInMillis[timeUnit.day];
  if (options.time) {
    const testInterval = String2TimeInterval(options.time);
    if (!isNaN(testInterval)) {
      interval = testInterval;
    }
  }
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
  return responseMessage;
}

export interface Options {
  admins?: string[];
}

export const name = "SaveLoad";
export function apply(ctx: Context, options: Options) {
  const { admins = [] } = options;
  ctx
    .command("pingme", "Ping me in private")
    .action(({ session }) => {
      if (session?.userId) {
        session.bot.sendPrivateMessage(session.userId, "喂喂");
      }
    });
  ctx
    .command("save <message:text>", "save message")
    .option("time", "-t <time>") // "specify the expire time(sample: 7d8h)
    .option("echo", "-e") // "echo message body (for test)
    .option("keep", "-k") // "keep the message instead of auto delete
    .option("list", "-l") // "list all cached message
    .option("clear", "-c") // "clear all the message
    .action(async ({ session, options = {} }, message) => {
      if (!session) {
        return;
      }
      let responseMessage: string = "Completed";
      let response: Promise<void | void[]> = Promise.resolve();
      if (options.echo) {
        response = response.then(() => session.send(message));
      }
      const isAdmin = admins.includes(session.userId!);
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
      }

      responseMessage = await saveMessage(session, message, options);
      response
        .then(() => session.send(responseMessage))
        .catch((e) => session.send(e));
    });

  ctx.on("message", (session) => {
    if (session.subtype !== "private") {
      return;
    }
    if (messageCache.has(session.content!)) {
      const cacheContent = messageCache.get(session.content!)!;
      session.bot
        .sendPrivateMessage(session.userId!, cacheContent.message)
        .then((messageId) => {
          if (messageId && cacheContent.autoDelete) {
            setTimeout(() => {
              session.bot.$deleteMsgAsync(messageId);
            }, timeUnitInMillis[timeUnit.minute]);
          }
        });
    }
  });

  const keyword = "兔兔保存";
  ctx.middleware(async (session, next) => {
    const msg = session.content;
    if (msg && (msg.startsWith(keyword) || msg.endsWith(keyword))) {
      const segs = segment.parse(msg);
      let content = "";
      for (let seg of segs) {
        if (seg.type === "quote") {
          const quoteMsg = await session.bot.getMessage(session.channelId!, seg.data.id);
          content = quoteMsg.content!;
        }
      }
      if (!content) {
        content = msg.replace(keyword, "").trim();
      }
      return session.sendQueued(await saveMessage(session, content, {}));
    }
    return next();
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
