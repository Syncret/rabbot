
import { Context, Dict, Random, Schema, Session, segment } from 'koishi'
import { } from "koishi-plugin-adapter-onebot";
import { formatString } from "./util";

export const name = 'rabbit-repeater'

export interface Config {
  enabledGuilds?: string
}

export const Config: Schema<Config> = Schema.object({
  enabledGuilds: Schema.string().description("Guilds enabling the repeater")
})

interface RepeatState {
  content: string
  repeated: boolean
  times: number
  users: Dict<number>
}

type StateCallback = (state: RepeatState, session: Session) => void | string

const banMessages = [
  `复读机失控了！兔兔只来得及逮捕最后一个复读机！那个人就是...{0}! `,
  `每个复读机都觉得自己不会被捉，今天就由兔兔来教会{0}世界的残酷！`,
  `{0} 复读机从历史中学到的唯一教训,就是复读机无法从历史中学到任何教训...(兔兔叹气`,
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
  [TimeSpan.eternal]: "之前"
}
const defaultTimeSpan = TimeSpan.eternal;

const rolePermissionMap = {
  owner: 3,
  admin: 2,
  member: 1,
};
let banRecord: Record<string, number> = {};
const firstSpeakerByGuild: Record<string, string> = {};
let banDate = -1;

export function getRepeaterConfig(enableGuilds: string[] = []) {
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
      const guildId = session.guildId!;
      if (!enableGuilds.includes(guildId)) {
        return;
      }
      const userId = session.userId!;
      if (state.users[userId] > 1) {
        return segment.at(userId) + " 兔兔出警，不许重复复读！";
      }
      if (state.times === 2) {
        const firstSpeaker = Object.keys(state.users).filter((u) => u !== userId)[0];
        firstSpeakerByGuild[guildId] = firstSpeaker;
      }
      if (state.times > 2 && Random.bool(state.times / 19)) {
        ban(session, userId, state.times);
        updateBanRecord(userId)
        const banMessage = Random.pick(banMessages);
        if (typeof banMessage === "function") {
          return banMessage(state.content, userId);
        }
        return formatString(banMessage, segment.at(userId).toString());
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
      const guildId = session.guildId!;
      const content = session.content;
      if (!enableGuilds.includes(guildId)) {
        return;
      }
      if (!content || content.startsWith("/") || times < 3) {
        return;
      }
      if (/举报复读/.test(content)) {
        const repeatedUsers = Object.keys(users).filter((u) => u !== firstSpeakerByGuild[guildId]);
        const deductCount = times < 5 ? 0 : times < 10 ? 1 : 2;
        const banCount = updateBanRecord(userId, -deductCount);
        const newBanUser = Random.pick(repeatedUsers);
        ban(session, newBanUser, times);
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
        msg += `${segment.at(userId)} `;
        msg += `让我们送一名被举报的复读机进小黑屋吧！就你了，${segment.at(newBanUser)}！`;
        return msg;
      }
    },
  };
};

function getBanCount(userId: string) {
  const date = new Date();
  const timeSpan = defaultTimeSpan as TimeSpan;
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
  return banTimes;
}

function updateBanRecord(userId: string, count: number = 1) {
  let banTimes = getBanCount(userId) + count;
  if (banTimes < 0) {
    banTimes = 0;
  }
  banRecord[userId] = banTimes;
  return banTimes;
}

async function ban(session: Session, userId: string, time: number): Promise<void> {
  const { guildId, selfId, platform } = session;
  if (!guildId || !selfId || !userId) {
    throw Error("Invalid parameters.");
  }
  if (platform !== "onebot") {
    return;
  }
  const self = await session.onebot.getGroupMemberInfo(guildId, selfId);
  if (self.role !== "admin" && self.role !== "owner") {
    return;
  }
  if (selfId === userId) {
    session.sendQueued("什么是兔兔自己？...啦，啦啦啦~♪");
  }
  const dayString = timeSpanString[defaultTimeSpan];
  const banCount = getBanCount(userId);
  const banTimeInMinute = time * (2 ** banCount);
  const banTimeString = `${time}${banCount > 0 ? "x2".repeat(banCount) + `=${banTimeInMinute}` : ""}分钟`;
  const user = await session.onebot.getGroupMemberInfo(guildId, userId);
  if (rolePermissionMap[self.role!] > rolePermissionMap[user.role!]) {
    setTimeout(
      () => {
        session.sendQueued(`${banCount > 0 ? `${dayString}已有${banCount}次被捕，惩罚${"翻".repeat(banCount)}倍！` : ""}禁言时间为本次复读次数${banTimeString}!`);
        if (Random.bool(0.2)) {
          session.sendQueued(`不过今天兔兔心情好，这次就算了吧，兔兔我也很忙的！`);
          return;
        }
        if (banTimeInMinute > 60 && Random.bool(0.4)) {
          session.sendQueued(`怎么又是你！唉看你也怪可怜的，这次兔兔就大发慈悲地放过你吧~`);
          return;
        }
        session.onebot.setGroupBanAsync(guildId, userId, banTimeInMinute * 60);
        if (banCount > 0 && Random.bool(0.3)) {
          session.sendQueued(`(兔兔低语: 举报5人以上复读现场可以减轻刑罚哦~)`);
        }
      },
      2000
    );
  } else if (user.role === "admin") {
    setTimeout(
      () => session.sendQueued(`可恶，是狗管理，兔兔的力量还不够大...${dayString}已有${banCount}次被捕，请自觉禁...算了反正你们也不会自觉的。`),
      2000
    );
  } else if (user.role === "owner") {
    setTimeout(
      () => session.sendQueued("啊，是群主，兔兔只是路过..."),
      2000
    );
  }
}

export function apply(ctx: Context, config: Config = {}) {
  ctx = ctx.guild();
  const enabledGuilds = (config.enabledGuilds ?? "").split(",").map((i) => i.trim());
  let repeaterConfig = getRepeaterConfig(enabledGuilds);
  const states: Dict<RepeatState> = {}

  function getState(id: string) {
    return states[id] || (states[id] = {
      content: '',
      repeated: false,
      times: 0,
      users: {},
    })
  }

  ctx.before('send', ({ cid, content }) => {
    const state = getState(cid)
    state.repeated = true
    if (state.content === content) {
      state.times += 1
    } else {
      state.content = content
      state.times = 1
      state.users = {}
    }
  })

  ctx.middleware((session, next) => {
    const { content, uid, userId } = session

    // never respond to messages from self
    if (ctx.bots[uid]) return

    const state = getState(session.cid)
    const check = (handle: StateCallback) => {
      const text = handle?.(state, session)
      return text && next(text)
    }

    // duplicate repeating & normal repeating
    if (content === state.content) {
      state.times += 1
      state.users[userId] = (state.users[userId] || 0) + 1
      return check(repeaterConfig.onRepeat) || next()
    }

    // interrupt repeating
    const result = check(repeaterConfig.onInterrupt)
    if (result) return result

    // unrepeated message
    state.content = content
    state.repeated = false
    state.times = 1
    state.users = { [userId]: 1 }
    return next()
  })
}
