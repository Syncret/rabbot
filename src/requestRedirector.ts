import { Context, Meta, Events, Command } from "koishi-core";

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

interface RequestHandlerInfo {
  requestType: Events;
  pendingRequest: Map<number, RequestInfo>;
  getId: (meta: Meta<"request">) => number;
  commandName: string;
  sendRequestInfoToAdmin: (
    ctx: Context,
    admin: number,
    meta: Meta<"request">
  ) => void;
  handleRequest: (
    ctx: Context,
    flag: string,
    options: Record<string, any>
  ) => Promise<void>;
}

const friendRequestHandlerInfo: RequestHandlerInfo = {
  requestType: "request/friend",
  pendingRequest: pendingFriendRequests,
  getId: (meta: Meta<"request">) => meta.userId,
  commandName: ".friend",
  sendRequestInfoToAdmin: (
    ctx: Context,
    admin: number,
    meta: Meta<"request">
  ) => {
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
  },
  handleRequest: (ctx: Context, flag: string, options: Record<string, any>) => {
    let response: Promise<void>;
    if (!options.reject && options.comment) {
      response = ctx.sender.setFriendAddRequest(flag, options.comment);
    } else {
      response = ctx.sender.setFriendAddRequest(flag, !options.reject);
    }
    return response;
  },
};

const groupInviteRequestHandlerInfo: RequestHandlerInfo = {
  requestType: "request/group/invite",
  pendingRequest: pendingGroupRequests,
  getId: (meta: Meta<"request">) => meta.groupId,
  commandName: ".group",
  sendRequestInfoToAdmin: (
    ctx: Context,
    admin: number,
    meta: Meta<"request">
  ) => {
    ctx.sender.sendPrivateMsgAsync(
      admin,
      `Receive group invite request\nUserId:${meta.userId}\nGroupId:${meta.groupId}\nFlag:${meta.flag}`
    );
    ctx.sender.getGroupInfo(meta.groupId).then((info) => {
      ctx.sender.sendPrivateMsgAsync(
        admin,
        `${meta.groupId} Info\nGroupName:${info.groupName}\nMemberCount:${info.memberCount}\nMaxMemberCount:${info.maxMemberCount}`
      );
      const cacheInfo = pendingGroupRequests.get(meta.groupId);
      if (cacheInfo) {
        cacheInfo.name = info.groupName;
      }
    });
  },
  handleRequest: (ctx: Context, flag: string, options: Record<string, any>) => {
    return ctx.sender.setGroupAddRequest(flag, "invite", !options.reject);
  },
};

function createReceiver(
  ctx: Context,
  admin: number,
  handlerInfo: RequestHandlerInfo,
  autoAccept: boolean
) {
  ctx.receiver.on(handlerInfo.requestType, async (meta) => {
    const id = handlerInfo.getId(meta);
    if (admin) {
      handlerInfo.sendRequestInfoToAdmin(ctx, admin, meta);
    }
    if (typeof autoAccept === "boolean") {
      return autoAccept
        ? meta.$approve().then(() => {
            ctx.sender.sendPrivateMsgAsync(
              admin,
              `Auto accepted ${handlerInfo.requestType}\nId:${id}`
            );
          })
        : meta.$reject().then(() => {
            ctx.sender.sendPrivateMsgAsync(
              admin,
              `Auto rejected ${handlerInfo.requestType}\nId:${id}`
            );
          });
    } else {
      handlerInfo.pendingRequest.set(id, {
        id,
        flag: meta.flag,
        comment: meta.comment,
      });
    }
  });
}

function createCommand(
  ctx: Context,
  parentCommand: Command,
  admin: number,
  handlerInfo: RequestHandlerInfo
) {
  return parentCommand
    .subcommand(
      handlerInfo.commandName,
      `handle ${handlerInfo.requestType} requests`
    )
    .option("-l, --list", "list all requests")
    .option("-a, --all", "apply to all pending requests")
    .option("-r, --reject", "reject requests")
    .option("-f, --flag [flag]", "specify the request of a specific flag")
    .option("-i, --id [id]", "specify the request of a specific id")
    .option("-c, --comment [comment]", "add remark to the accepted friend")
    .action(({ meta, options }) => {
      if (meta.userId !== admin) {
        meta.$send("Not authorized");
        return;
      }
      let message: string = "Completed";
      let response: Promise<void | void[]> = Promise.resolve();
      let pendingRequests = handlerInfo.pendingRequest;
      let handleRequest = handlerInfo.handleRequest;
      if (options.list) {
        if (pendingRequests.size === 0) {
          message = "No pending requests";
        } else {
          message = Array.from(pendingRequests.values())
            .map((r) => `Id:${r.id} Name:${r.name} Comment:${r.comment}`)
            .join("\n");
        }
      } else if (options.flag) {
        response = handleRequest(ctx, options.flag, options).then(() => {
          Array.from(pendingRequests.values()).forEach((r) => {
            if (r.flag === options.flag) {
              pendingRequests.delete(options.id);
            }
          });
        });
      } else if (options.id) {
        const info = pendingRequests.get(options.id);
        if (info == null) {
          message = `Failed to get info of Id ${options.id}, try using flag to speficy request`;
        } else {
          response = handleRequest(ctx, info.flag, options).then(() => {
            pendingRequests.delete(info.id);
            return;
          });
        }
      } else if (options.all) {
        response = Promise.all(
          Array.from(pendingRequests.values()).map((info) =>
            handleRequest(ctx, info.flag, options).then(() => {
              pendingRequests.delete(info.id);
              return;
            })
          )
        );
      } else {
        message =
          "Specify an option to execute, use help to get command information";
      }
      response.then(() => meta.$send(message));
    });
}

export function apply(ctx: Context, options: Options) {
  const { admin, acceptFriend, acceptGroupInvite } = options;
  createReceiver(ctx, admin, friendRequestHandlerInfo, acceptFriend);
  createReceiver(ctx, admin, groupInviteRequestHandlerInfo, acceptGroupInvite);

  const requestCommand = ctx.command(
    "request",
    "handle friend and group requests"
  );
  createCommand(ctx, requestCommand, admin, friendRequestHandlerInfo);
  createCommand(ctx, requestCommand, admin, groupInviteRequestHandlerInfo);
}
