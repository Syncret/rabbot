import { Random, segment, Session } from "koishi";
import { Config } from "koishi-plugin-common";

export function repeaterConfig(enableBanGroups: string[] = []): Config {
  return {
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
      if (enableBanGroups.includes(session.groupId!)) {
        if (state.users[session.userId!] > 1) {
          return segment.at(session.userId!) + "兔兔出警，不许重复复读！";
        }
        if (state.times > 2 && Random.bool(state.times / 20)) {
          ban(session, session.userId!, state.times);
          return (
            `复读机失控了！兔兔只来得及逮捕最后一个复读机！` +
            `那个人就是...${segment.at(session.userId!)}! `
          );
        }
      }
      if (state.times > 2 && !state.repeated && Random.bool(0.4)) {
        return state.content;
      }
    },
  };
};

const rolePermissionMap = {
  owner: 3,
  admin: 2,
  member: 1,
};
let banRecord: Record<string, number> = {};
let banDate = -1;
function addTodayBanRecord(userId: string) {
  let today = new Date().getDate();
  if (today !== banDate) {
    banDate = today;
    banRecord = {};
  }
  let banTimes = banRecord[userId] || 0;
  banRecord[userId] = ++banTimes;
  return banTimes;
}

async function ban(session: Session, userId: string, time: number): Promise<void> {
  const { groupId, selfId } = session;
  if (!groupId || !selfId || !userId) {
    throw Error("Invalid parameters.");
  }
  const self = await session.bot.$getGroupMemberInfo(groupId, selfId);
  if (self.role !== "admin" && self.role !== "owner") {
    return;
  }
  const banCount = addTodayBanRecord(userId);
  const factor = 2 ** (banCount - 1);
  const banTimeString = `${time}${banCount > 1 ? "x2".repeat(banCount - 1) + `=${time * factor}` : ""}分钟`;
  const user = await session.bot.$getGroupMemberInfo(groupId, userId);
  if (rolePermissionMap[self.role!] > rolePermissionMap[user.role!]) {
    setTimeout(
      () => {
        session.send(`今天累计第${banCount}次被捕，${banCount > 1 ? "惩罚翻倍！" : ""}禁言时间为本次复读次数${banTimeString}!`);
        session.bot.$setGroupBanAsync(groupId, userId, time * factor * 60);
      },
      500
    );

  } else if (user.role === "admin") {
    setTimeout(
      () => session.sendQueued(`可恶，是狗管理，兔兔的力量还不够大...今天累计第${banCount}次被捕，请自觉禁言${banTimeString}。`),
      2000
    );
  } else if (user.role === "owner") {
    setTimeout(
      () => session.sendQueued("啊，是群主，兔兔只是路过..."),
      2000
    );
  }
}
