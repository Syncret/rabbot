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
      ctx.sender.sendPrivateMsgAsync(admin, `Receive friend request\nId:${meta.userId}\nComment:${meta.comment}}`);
      ctx.sender.getStrangerInfo(meta.userId).then(info => {
        ctx.sender.sendPrivateMsgAsync(admin, `${meta.userId} Info\nNickname:${info.nickname}\nSex:${info.sex}\nAge:${info.age}`);
        const cacheInfo = pendingFriendRequests.get(meta.userId);
        if (cacheInfo) {
          cacheInfo.name = info.nickname;
        }
      })
    }
    if (typeof acceptFriend === "boolean") {
      return acceptFriend ? meta.$approve().then(() => {
        ctx.sender.sendPrivateMsgAsync(admin, `Auto accepted friend request\nId:${meta.userId}`);
      }) : meta.$reject().then(() => {
        ctx.sender.sendPrivateMsgAsync(admin, `Auto rejected friend request\nId:${meta.userId}`);
      });
    } else {
      pendingFriendRequests.set(meta.userId, {
        id: meta.userId,
        flag: meta.flag,
        comment: meta.comment,
      })
    }
  });
  
  ctx.command("request").subcommand("friend")
    .option("-l, --list").option("-a, --all").option("-r, --reject").option("-i, --id [id]").option("-comment, --comment [comment]")
    .action(({ meta, options }) => {
      if (meta.userId !== admin) {
        return;
      }
      let message: string = "Completed";
      let response: Promise<void | void[]> = Promise.resolve();
      const handleRequest = (info: RequestInfo) => {
        if (!options.reject && options.comment) {
          return ctx.sender.setFriendAddRequest(info.flag, options.comment);
        } else {
          return ctx.sender.setFriendAddRequest(info.flag, !options.reject);
        }
      }
      if (options.list) {
        message = [...pendingFriendRequests.values()].map((r) => `Id:${r.id} Name:${r.name} Flag:${r.flag};${r.comment}`).join("\n");
      } else if (options.id) {
        const info = pendingFriendRequests.get(options.id);
        if (info == null) {
          message = `Failed to get info of Id ${options.id}`;
        } else {
          response = handleRequest(info);
        }
      } else if (options.all) {
        response = Promise.all([...pendingFriendRequests.values()].map((info) => handleRequest(info)));
      } else {
        return;
      }
      response.then(() => meta.$send(message));
    })
}
