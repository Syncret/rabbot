import { Random, segment, Session } from "koishi";
import { Config } from "koishi-plugin-common";
import { pickRandomly } from "./util";

export const repeaterConfig: Config = {
  onRepeat: (
    state: {
      times: number;
      repeated: boolean;
      content: string;
      users: Record<string, number>;
    },
    session: Session
  ) => {
    if (state.content.startsWith("/")) {
      return;
    }
    if (state.users[session.userId!] > 1) {
      return segment.at(session.userId!) + "兔兔出警，不许重复复读！";
    }
    if (state.times > 2 && !state.repeated && Random.bool(0.4)) {
      return state.content;
    }
    if (state.times >= 4 && Random.bool(0.3)) {
      const banUser = pickRandomly(Object.keys(state.users));
      ban(session, banUser, state.times * 60);
      return (
        `复读机失控了！兔兔不得不随机逮捕一个复读机禁言。` +
        `那个人就是...${segment.at(banUser)}! 禁言时间为复读次数${
          state.times
        }分钟!`
      );
    }
  },
};

const rolePermissionMap = {
  owner: 3,
  admin: 2,
  member: 1,
};

async function ban(session: Session, userId:string,  time: number): Promise<void> {
  const { groupId, selfId } = session;
  if (!groupId || !selfId || !userId) {
    throw Error("Invalid parameters.");
  }
  const self = await session.bot.$getGroupMemberInfo(groupId, selfId);
  if (self.role !== "admin" && self.role !== "owner") {
    return;
  }
  const user = await session.bot.$getGroupMemberInfo(groupId, userId);
  if (rolePermissionMap[self.role!] > rolePermissionMap[user.role!]) {
    session.bot.$setGroupBanAsync(groupId, userId, time);
  } else if (user.role === "admin") {
    setTimeout(
      () => session.sendQueued("可恶，是狗管理，兔兔的力量还不够大..."),
      2000
    );
  } else if (user.role === "owner") {
    setTimeout(
      () =>  session.sendQueued("啊，是群主，兔兔只是路过..."),
      2000
    );
  }
}
