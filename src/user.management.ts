import { Context } from "koishi-core";

export interface Options {
  admin?: number;
  acceptFriend?: boolean; // true: accept, false: reject, undefined: do nothing
  acceptGroupInvite?: boolean;
}

export function apply(ctx: Context, options: Options) {
  const { admin, acceptFriend, acceptGroupInvite } = options;

  ctx.receiver.on("request/friend", async (meta) => {
    if (admin) {
        ctx.sender.sendPrivateMsgAsync(admin, `receive friend request\nId:${meta.userId}\nComment:${meta.comment}\nFlag:${meta.flag}`)
    }
    if (typeof acceptFriend === "boolean") {
      return acceptFriend ? meta.$approve() : meta.$reject();
    } 
  });
}
