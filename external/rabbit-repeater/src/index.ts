
import { Context, Dict, Random, Schema, Session, segment } from 'koishi'
import { } from "koishi-plugin-adapter-onebot";

export const name = 'rabbit-repeater'
interface RepeatState {
  content: string
  repeated: boolean
  times: number
  users: Dict<number>
}

type StateCallback = (state: RepeatState, session: Session) => void | string

export interface Config {
  onRepeat?: StateCallback
  onInterrupt?: StateCallback
}


export const Config: Schema<Config> = Schema.object({
  onRepeat: Schema.function().hidden().description('on repeat'),
  onInterrupt: Schema.function().hidden().description('on interrupt'),
})

function repeaterConfig(): Config {
  return {
    onRepeat: (
      state: RepeatState,
      session: Session
    ) => {
      if (state.content.startsWith("/")) {
        return;
      }
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
  const { guildId, selfId, onebot } = session;
  if (!onebot) {
    return;
  }
  if (!guildId || !selfId || !userId) {
    throw Error("Invalid parameters.");
  }
  const self = await onebot.getGroupMemberInfo(guildId, selfId);
  if (self.role !== "admin" && self.role !== "owner") {
    return;
  }
  const banCount = addTodayBanRecord(userId);
  const factor = 2 ** (banCount - 1);
  const banTimeString = `${time}${banCount > 1 ? "x2".repeat(banCount - 1) + `=${time * factor}` : ""}分钟`;
  const user = await onebot.getGroupMemberInfo(guildId, userId);
  if (rolePermissionMap[self.role!] > rolePermissionMap[user.role!]) {
    setTimeout(
      () => {
        session.send(`今天累计第${banCount}次被捕，${banCount > 1 ? "惩罚翻倍！" : ""}禁言时间为本次复读次数${banTimeString}!`);
        onebot.setGroupBanAsync(guildId, userId, time * factor * 60);
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

export function apply(ctx: Context, config: Config = repeaterConfig()) {
  ctx = ctx.guild();
  config = repeaterConfig();
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
      return check(config.onRepeat) || next()
    }

    // interrupt repeating
    const result = check(config.onInterrupt)
    if (result) return result

    // unrepeated message
    state.content = content
    state.repeated = false
    state.times = 1
    state.users = { [userId]: 1 }
    return next()
  })
}
