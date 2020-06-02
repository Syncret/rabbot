import { Context } from "koishi-core";

export interface Options {
  admins?: number[];
}

export function apply(ctx: Context, options: Options) {
  const { admins = [] } = options;
  ctx
    .command("message", "redirect messages")
    .subcommand("send <message...>", "send message to user/group/discuss")
    .option("-g, --group [group]", "send message to group")
    .option("-u, --user [user]", "send message to user")
    .option("-d, --discuss [discuss]", "send message to discuss")
    .action(({ meta, options }, message) => {
      if (meta.messageType !== "private") {
        return;
      }
      if (!admins.includes(meta.userId)) {
        meta.$send("Not authorized");
        return;
      }
      let responseMessage: string = "Completed";
      let response: Promise<void | void[]> = Promise.resolve();
      const splitIDs = (ids: string | number) => {
        if (typeof ids === "number") {
          return [ids];
        } else {
          return ids.split(",").map((id) => parseInt(id));
        }
      };
      if (options.user) {
        const ids = splitIDs(options.user);
        response = response.then(() =>
          Promise.all(
            ids.map((id) => ctx.sender.sendPrivateMsgAsync(id, message))
          )
        );
      }
      if (options.group) {
        const ids = splitIDs(options.group);
        response = response.then(() =>
          Promise.all(
            ids.map((id) => ctx.sender.sendGroupMsgAsync(id, message))
          )
        );
      }
      if (options.discuss) {
        const ids = splitIDs(options.discuss);
        response = response.then(() =>
          Promise.all(
            ids.map((id) => ctx.sender.sendDiscussMsgAsync(id, message))
          )
        );
      }
      response
        .then(() => meta.$send(responseMessage))
        .catch((e) => meta.$send(e));
    });
}
