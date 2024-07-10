import { Bot, Session } from "koishi";
import { Context, Command } from "koishi-core";
import "koishi-adapter-onebot";

export interface Options {
  admin: string;
  acceptFriend?: boolean; // true: accept, false: reject, undefined: do nothing
  acceptGroupInvite?: boolean;
}

interface RequestInfo {
  id: string;
  flag: string;
  comment?: string;
  name?: string;
}

const pendingFriendRequests = new Map<string, RequestInfo>();
const pendingGroupRequests = new Map<string, RequestInfo>();

type RequestType = "friend-request" | "group-request";
type RequestSession = Session<never, never, "onebot", any>;
interface RequestHandlerInfo {
  requestType: RequestType;
  pendingRequest: Map<string, RequestInfo>;
  getId: (session: RequestSession) => string;
  commandName: string;
  sendRequestInfoToAdmin: (admin: string, session: RequestSession) => void;
  handleRequest: (
    bot: Bot,
    flag: string,
    approve: boolean,
    comment?: string
  ) => Promise<void>;
}

const friendRequestHandlerInfo: RequestHandlerInfo = {
  requestType: "friend-request",
  pendingRequest: pendingFriendRequests,
  getId: (session: RequestSession) => session.userId!,
  commandName: ".friend",
  sendRequestInfoToAdmin: (admin, session) => {
    session.bot.sendPrivateMessage(
      admin,
      `Receive friend request\nId:${session.userId}\nComment:${session.content}\nId:${session.messageId}`
    );
    session.bot.getUser(session.userId!).then((info) => {
      session.bot.sendPrivateMessage(
        admin,
        `${session.userId} Info\nName:${info.username}\n; ${JSON.stringify(
          info
        )}`
      );
      const cacheInfo = pendingFriendRequests.get(session.userId!);
      if (cacheInfo) {
        cacheInfo.name = info.username;
      }
    });
  },
  handleRequest: (bot, id, approve, comment) => {
    let response: Promise<void>;
    response = bot.handleFriendRequest(id, approve, comment);
    return response;
  },
};

const groupInviteRequestHandlerInfo: RequestHandlerInfo = {
  requestType: "group-request",
  pendingRequest: pendingGroupRequests,
  getId: (session: RequestSession) => session.groupId!,
  commandName: ".group",
  sendRequestInfoToAdmin: (admin, session) => {
    session.bot.sendPrivateMessage(
      admin,
      `Receive group invite request\nUserId:${session.userId}\nGroupId:${session.groupId}\nId:${session.messageId}`
    );
    session.bot.getGroup(session.groupId!).then((info) => {
      session.bot.sendPrivateMessage(
        admin,
        `${session.groupId} Info\nGroupName:${info.groupName
        }\n; ${JSON.stringify(info)}`
      );
      const cacheInfo = pendingGroupRequests.get(session.groupId!);
      if (cacheInfo) {
        cacheInfo.name = info.groupName;
      }
    });
  },
  handleRequest: (bot, id, approve, comment) => {
    return bot.handleGroupRequest(id, approve, comment);
  },
};

function createReceiver(
  ctx: Context,
  admin: string,
  handlerInfo: RequestHandlerInfo,
  autoAccept?: boolean
) {
  ctx.on(
    handlerInfo.requestType,
    async (session: RequestSession) => {
      const id = handlerInfo.getId(session);
      if (admin) {
        handlerInfo.sendRequestInfoToAdmin(admin, session);
      }
      if (typeof autoAccept === "boolean") {
        return handlerInfo
          .handleRequest(session.bot, session.messageId!, autoAccept)
          .then(() => {
            session.bot.sendPrivateMessage(
              admin,
              `Auto ${autoAccept ? "accepted" : "reject"} ${handlerInfo.requestType
              }\nId:${id}`
            );
          });
      } else {
        handlerInfo.pendingRequest.set(id, {
          id,
          flag: session.messageId!,
          comment: session.content,
        });
      }
    }
  );
}

function createCommand(
  ctx: Context,
  parentCommand: Command,
  admin: string,
  handlerInfo: RequestHandlerInfo
) {
  return parentCommand
    .subcommand(
      handlerInfo.commandName,
      `handle ${handlerInfo.requestType} requests`,
      { authority: 3 }
    )
    .option("list", "-l") // list all requests
    .option("all", "-a") // apply to all pending requests
    .option("reject", "-r") // reject requests
    .option("flag", "-f [flag:string]") // specify the request of a specific flag
    .option("id", "-i [id:string]") // specify the request of a specific id
    .option("comment", "-c [comment:string]") // add remark to the accepted friend
    .action(({ session, options = {} }) => {
      if (!session) {
        return;
      }
      if (session.userId !== admin) {
        session.send("Not authorized");
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
        response = handleRequest(
          session.bot,
          options.flag,
          !options.reject,
          options.comment
        ).then(() => {
          Array.from(pendingRequests.values()).forEach((r) => {
            if (r.flag === options.flag) {
              pendingRequests.delete(r.id);
            }
          });
        });
      } else if (options.id) {
        const info = pendingRequests.get(options.id);
        if (info == null) {
          message = `Failed to get info of Id ${options.id}, try using flag to speficy request`;
        } else {
          response = handleRequest(
            session.bot,
            info.flag,
            !options.reject,
            options.comment
          ).then(() => {
            pendingRequests.delete(info.id);
            return;
          });
        }
      } else if (options.all) {
        response = Promise.all(
          Array.from(pendingRequests.values()).map((info) =>
            handleRequest(
              session.bot,
              info.flag,
              !options.reject,
              options.comment
            ).then(() => {
              pendingRequests.delete(info.id);
              return;
            })
          )
        );
      } else {
        message =
          "Specify an option to execute, use help to get command information";
      }
      response.then(() => session.send(message));
    });
}

export function apply(ctx: Context, options: Options) {
  const { admin, acceptFriend, acceptGroupInvite } = options;
  if (!admin) {
    throw `admin must be set`;
  }
  createReceiver(ctx, admin, friendRequestHandlerInfo, acceptFriend);
  createReceiver(ctx, admin, groupInviteRequestHandlerInfo, acceptGroupInvite);
  ctx.on("friend-added", (session) => {
    session.bot.sendPrivateMessage(admin, `${JSON.stringify(session)}`);
  });
  ctx.on("friend-deleted", (session) => {
    session.bot.sendPrivateMessage(admin, `${JSON.stringify(session)}`);
  });

  const requestCommand = ctx.command(
    "request",
    "handle friend and group requests"
  );
  createCommand(ctx, requestCommand, admin, friendRequestHandlerInfo);
  createCommand(ctx, requestCommand, admin, groupInviteRequestHandlerInfo);
}
export const name = "RequestRedirector";
