import { Context } from "koishi-core";

export interface Options {
  admins?: string[];
}

export const name = "MessageRedirector";

export function apply(ctx: Context, options: Options) {
  const { admins = [] } = options;
  ctx
    .command("message", "redirect messages")
    .subcommand("send <message:text>", "send message to user/group/discuss")
    .option("group", "-g <group:string>") // send message to group
    .option("user", "-u <user:string>") // send message to user
    .option("echo", "-e") // echo message body (for test)
    .action(({ session, options = {} }, message) => {
      if (session?.subtype !== "private") {
        return;
      }
      if (!admins.includes(session.userId!)) {
        session.send("Not authorized");
        return;
      }
      let responseMessage: string = "Completed";
      let response: Promise<any> = Promise.resolve();
      if (options.echo) {
        response = response.then(() => session.send(message));
      }
      const splitIDs = (ids: string) => {
        return ids.split(",");
      };
      if (options.user) {
        const ids = splitIDs(options.user);
        response = response.then(() =>
          Promise.all(
            ids.map((id) => session.bot.sendPrivateMessage(id, message))
          )
        );
      }
      if (options.group) {
        const ids = splitIDs(options.group);
        response = response.then(() =>
          Promise.all(
            ids.map((id) => session.bot.sendGroupMessage(id, message))
          )
        );
      }
      response
        .then(() => session.send(responseMessage))
        .catch((e) => session.send(e));
    });
}
