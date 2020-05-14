import { Context } from "koishi-core";

export interface Options {
  admin?: number;
  acceptFriend?: boolean; // true: accept, false: reject, undefined: do nothing
  acceptGroupInvite?: boolean;
}

interface RequestInfo {
  id: number;
  flag: string;
  comment?: string;
  name?: string;
}

const pendingFriendRequests = new Map<number, RequestInfo>();
const pendingGroupRequests = new Map<number, RequestInfo>();

export function apply(ctx: Context, options: Options) {
  const { admin, acceptFriend, acceptGroupInvite } = options;

  ctx.receiver.on("request/friend", async (meta) => {
    if (admin) {
      ctx.sender.sendPrivateMsgAsync(
        admin,
        `Receive friend request\nId:${meta.userId}\nComment:${meta.comment}}\nFlag:${meta.flag}`
      );
      ctx.sender.getStrangerInfo(meta.userId).then((info) => {
        ctx.sender.sendPrivateMsgAsync(
          admin,
          `${meta.userId} Info\nNickname:${info.nickname}\nSex:${info.sex}\nAge:${info.age}`
        );
        const cacheInfo = pendingFriendRequests.get(meta.userId);
        if (cacheInfo) {
          cacheInfo.name = info.nickname;
        }
      });
    }
    if (typeof acceptFriend === "boolean") {
      return acceptFriend
        ? meta.$approve().then(() => {
            ctx.sender.sendPrivateMsgAsync(
              admin,
              `Auto accepted friend request\nId:${meta.userId}`
            );
          })
        : meta.$reject().then(() => {
            ctx.sender.sendPrivateMsgAsync(
              admin,
              `Auto rejected friend request\nId:${meta.userId}`
            );
          });
    } else {
      pendingFriendRequests.set(meta.userId, {
        id: meta.userId,
        flag: meta.flag,
        comment: meta.comment,
      });
    }
  });

  ctx
    .command("request", "handle friend and group requests")
    .subcommand("friend", "handle friend requests")
    .option("-l, --list", "list all friend requests")
    .option("-a, --all", "apply to all pending requests")
    .option("-r, --reject", "reject requests")
    .option("-f, --flag [flag]", "specify the request of a specific flag")
    .option("-i, --id [id]", "specify the request of a specific user id")
    .option("-c, --comment [comment]", "add remark to the accepted friend")
    .action(({ meta, options }) => {
      if (meta.userId !== admin) {
        return;
      }
      let message: string = "Completed";
      let response: Promise<void | void[]> = Promise.resolve();
      const handleRequest = (flag: string) => {
        if (!options.reject && options.comment) {
          return ctx.sender.setFriendAddRequest(flag, options.comment);
        } else {
          return ctx.sender.setFriendAddRequest(flag, !options.reject);
        }
      };
      if (options.list) {
        if (pendingFriendRequests.size === 0) {
          message = "No pending requests";
        } else {
          message = Array.from(pendingFriendRequests.values())
            .map((r) => `Id:${r.id} Name:${r.name} Comment:${r.comment}`)
            .join("\n");
        }
      } else if (options.flag) {
        response = handleRequest(options.flag);
      } else if (options.id) {
        const info = pendingFriendRequests.get(options.id);
        if (info == null) {
          message = `Failed to get info of Id ${options.id}, try using flag to accept request`;
        } else {
          response = handleRequest(info.flag);
        }
      } else if (options.all) {
        response = Promise.all(
          Array.from(pendingFriendRequests.values()).map((info) =>
            handleRequest(info.flag)
          )
        );
      } else {
        message = "Specify an option to execute, use help to get command information";
      }
      response.then(() => meta.$send(message));
    });
}
