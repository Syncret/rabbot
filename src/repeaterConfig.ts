import { Random, segment, Session } from "koishi";
import { Config } from "koishi-plugin-common";
import { formatString } from "./util";

const banMessages = [
  `复读机失控了！兔兔只来得及逮捕最后一个复读机！那个人就是...{0}! `,
  `每个复读机都觉得自己不会被捉，今天就由兔兔来教会{0}世界的残酷！`,
  `{0}复读机从历史中学到的唯一教训,就是复读机无法从历史中学到任何教训...(兔兔叹气`,
  (message: string, id: string) => {
    return `${message.substring(0, 3)}...你以为兔兔也要复读吗？不！${segment.at(id)}你被逮捕了！`;
  }
];

enum TimeSpan {
  daily = "daily",
  weekly = "weekly",
  monthly = "monthly",
  eternal = "eternal",
}
const timeSpanString: Record<TimeSpan, string> = {
  [TimeSpan.daily]: "今日",
  [TimeSpan.weekly]: "本周",
  [TimeSpan.monthly]: "本月",
  [TimeSpan.eternal]: "累计"
}
const defaultTimeSpan = TimeSpan.eternal;

const rolePermissionMap = {
  owner: 3,
  admin: 2,
  member: 1,
};
let banRecord: Record<string, number> = {};
let banDate = -1;

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
        if (state.times > 2 && Random.bool(state.times / 19)) {
          ban(session, session.userId!, state.times);
          const banMessage = Random.pick(banMessages);
          if (typeof banMessage === "function") {
            return banMessage(state.content, session.userId!);
          }
          return formatString(banMessage, segment.at(session.userId!));
        }
      }
      if (state.times > 2 && !state.repeated && Random.bool(0.4)) {
        return state.content;
      }
    },
    onInterrupt: (
      state: {
        times: number;
        repeated: boolean;
        content: string;
        users: Record<string, number>;
      },
      session: Session
    ) => {
      const { times, users } = state;
      const userId = session.userId!;
      const content = session.content;
      if (!enableBanGroups.includes(session.groupId!)) {
        return;
      }
      if (!content || content.startsWith("/") || times < 3) {
        return;
      }
      if (/打断|举报/.test(content)) {
        const repeatedUsers = Object.keys(users);
        const deductCount = times < 6 ? 0 : times < 10 ? 1 : 2;
        const banCount = updateBanRecord(userId, defaultTimeSpan, -deductCount);
        const newBanUser = Random.pick(repeatedUsers);
        ban(session, userId, times);
        let msg = "";
        switch (deductCount) {
          case 0:
            if (repeatedUsers.includes(userId)) {
              msg += `看来你迷途知返了呢，再接再厉哦！`;
            } else {
              msg += `感谢你的举报！拍头，继续加油哦！`;
            }
            break;
          case 1:
            if (banCount > 0) {
              msg += `背叛复读机的滋味是不是很美妙，以后也不要让兔兔失望哦！`;
            } else {
              msg += `你成功地举报了一个小型复读现场！`;
            }
            break;
          case 2:
            msg += `你成功地举报了一个大型复读现场！`
            break;
        }
        if (deductCount > 0) {
          msg += `作为奖励去掉你的${deductCount}次逮捕记录，目前的逮捕记录是${banCount}次。`;
        }
        msg += `${segment.at(userId)}\n`;
        msg += `让我们送一名被举报的复读机进小黑屋吧！就你了，${segment.at(newBanUser)}！`;
        return msg;
      }
    },
  };
};

function updateBanRecord(userId: string, timeSpan: TimeSpan, count: number = 1) {
  const date = new Date();
  let today = date.getDate();
  switch (timeSpan) {
    case TimeSpan.weekly:
      today = date.getDate() - date.getDay() + 1;
      break;
    case TimeSpan.monthly:
      today = date.getMonth();
      break;
    case TimeSpan.eternal:
      today = banDate;
      break;
    default:
      break;
  }
  if (today !== banDate) {
    banDate = today;
    banRecord = {};
  }
  let banTimes = banRecord[userId] || 0;
  banTimes += count;
  if (banTimes < 0) {
    banTimes = 0;
  }
  banRecord[userId] = banTimes;
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
  if (selfId === userId) {
    session.sendQueued("什么是兔兔自己？...啦，啦啦啦~♪");
  }
  const dayString = timeSpanString[defaultTimeSpan];
  const banCount = updateBanRecord(userId, defaultTimeSpan);
  const factor = 2 ** (banCount - 1);
  const banTimeString = `${time}${banCount > 1 ? "x2".repeat(banCount - 1) + `=${time * factor}` : ""}分钟`;
  const user = await session.bot.$getGroupMemberInfo(groupId, userId);
  if (rolePermissionMap[self.role!] > rolePermissionMap[user.role!]) {
    setTimeout(
      () => {
        session.send(`${dayString}第${banCount}次被捕，${banCount > 1 ? `惩罚${"翻".repeat(banCount)}倍！` : ""}禁言时间为本次复读次数${banTimeString}!`);
        session.bot.$setGroupBanAsync(groupId, userId, time * factor * 60);
      },
      500
    );

  } else if (user.role === "admin") {
    setTimeout(
      () => session.sendQueued(`可恶，是狗管理，兔兔的力量还不够大...${dayString}第${banCount}次被捕，请自觉禁言${banTimeString}。`),
      2000
    );
  } else if (user.role === "owner") {
    setTimeout(
      () => session.sendQueued("啊，是群主，兔兔只是路过..."),
      2000
    );
  }
}
