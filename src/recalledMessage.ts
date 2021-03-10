import { Context, segment, Session } from "koishi-core";
import "koishi-adapter-onebot";
import { MessageInfo } from "koishi";
import { FixedSizeRecord } from "./util";

export interface Options {
  onDelete?: (session: Session.Payload<"message-deleted">) => void;
}

export const name = "recalledMessage";

const deletedMessageRecord: Record<string, FixedSizeRecord<MessageInfo>> = {};

const getChannelDeletedRecord = (
  channelId: string
): FixedSizeRecord<MessageInfo> => {
  return (
    deletedMessageRecord[channelId] ||
    (deletedMessageRecord[channelId] = new FixedSizeRecord(50))
  );
};

export function apply(ctx: Context, options: Options) {
  ctx.on("message-deleted", async (session) => {
    if (!session.channelId || !session.messageId) {
      return;
    }
    const message = await session.bot.getMessage(
      session.channelId,
      session.messageId
    );
    message &&
      getChannelDeletedRecord(session.channelId!).set(
        session.messageId,
        message
      );
  });
  ctx
    .command("recalled", "list recalled messages")
    .option("last", "-l [count:number] last recalled messages")
    .option("unescape", "-u unescape message")
    .option(
      "channelId",
      "-c [channelId:string] list corresponding channel's recall messages"
    )
    .action(({ session, options = {} }, message) => {
      if (!session || !session.channelId) {
        return;
      }
      if (options.channelId === "") {
        // list available channels
        return session.sendQueued(
          "Available channels:\n" +
            Object.entries(deletedMessageRecord)
              .filter(([_, value]) => value.length() > 0)
              .map(([key]) => key)
              .join("\n")
        );
      }
      const channel = options.channelId || session.channelId;
      const deletedMessages = getChannelDeletedRecord(channel);
      if (deletedMessages.length() === 0) {
        return session.sendQueued("No recalled message records");
      }
      const last = options.last || 1;
      segment.escape;
      const keys = deletedMessages
        .keys()
        .slice(deletedMessages.length() - last, deletedMessages.length());
      const messages = keys.map((key) => deletedMessages.get(key));
      return session.sendQueued(
        `Last ${last === 1 ? "" : last + " "}recalled message${
          last === 1 ? "" : "s"
        }:\n` +
          messages
            .map((msg) => {
              return `${
                msg?.timestamp ? new Date(msg.timestamp).toISOString() : ""
              }, ${msg?.author?.username}: ${
                options.unescape ? msg?.content : segment.escape(msg?.content)
              }`;
            })
            .join("\n")
      );
    });
}
