import { Session, template, Time, User } from "koishi";
import { getRemainingTime } from "./util";

export namespace State {
    export const active = 0x1;
    export const inMaze = 0x2;
    export const sleep = 0x4;
    export const tentacle = 0x8;

    const trapTimerStates = [sleep, tentacle];

    const timerAPKey = "rpgap";
    const timerDebuffKey = "rpgdebuff";

    const StateDismatchString: Record<number, [string, string]> = {
        [active]: ["角色未初始化，请使用start <角色名>指令创建新人物。", "已有角色存在。"],
        [inMaze]: ["角色不在迷宫中，请使用进入迷宫指令进入迷宫。", "已在迷宫中。"],
        [sleep]: ["你正昏睡着呢。", "你现在是清醒的呢。"],
        [tentacle]: ["你被触手紧紧地束缚着完全动不了呢。", "附近没有触手啦。"]
    };
    const TrapTimerString: Record<number, [string, string]> = {
        [sleep]: ["你从昏睡中醒来啦！", `估计还要睡{0}小时。`],
    };
    export function hasState(state: number = 0, target: number = 0): boolean {
        return (state & target) === target;
    }

    export function stateChecker(truthy?: number, falsy?: number) {
        return ({ session }: { session?: Session<"rpgstate" | "timers"> | undefined }) => {
            const user = session?.user!;
            const state = user.rpgstate;
            const trapTimer = user.timers[timerDebuffKey];
            for (const [key, msgs] of Object.entries(StateDismatchString)) {
                const checkState = Number(key);
                if (hasState(truthy, checkState) && !hasState(state, checkState)) {
                    console.log(truthy, checkState, state);
                    return msgs[0];
                }
                if (hasState(falsy, checkState) && hasState(state, checkState)) {
                    let msg = msgs[1];
                    if (trapTimerStates.includes(checkState) && trapTimer) {
                        if (trapTimer < Date.now()) {
                            user.rpgstate ^= sleep;
                            return TrapTimerString[checkState][0];
                        } else {
                            const remTime = getRemainingTime(trapTimer);
                            if (checkState === sleep && trapTimer) {
                                msg += template.format(TrapTimerString[checkState][1], [remTime]);
                            }
                        }
                    }
                    return msgs[1];
                }
            }
            return undefined;
        }
    }


    export const apRecoverInterval = 4 * Time.hour;
    const initialAp = 1;
    const maxAp = 24;

    export function apChecker(defaultAp = 1, returnDetail = false) {
        return ({ session, options }: { session?: Session<"rpgap" | "timers"> | undefined, options?: { ap?: number } }) => {
            const target = options?.ap || defaultAp;
            const now = Date.now();
            const user = session?.user!;
            const timers = user.timers!;
            if (user.rpgap == null) {
                user.rpgap = initialAp;
            }
            if (timers[timerAPKey] == null) {
                timers[timerAPKey] = now;
                return;
            }
            const recoverAp = Math.floor((now - timers[timerAPKey]) / apRecoverInterval);
            if (recoverAp + user.rpgap >= maxAp) {
                user.rpgap = maxAp;
                timers[timerAPKey] = now;
            } else if (recoverAp > 0) {
                user.rpgap += recoverAp;
                timers[timerAPKey] = timers[timerAPKey] + recoverAp * apRecoverInterval;
            }
            if (user.rpgap < target || returnDetail) {
                let msg = "";
                if (user.rpgap < target) {
                    msg += `体力不够呢。`;
                }
                const nextTime = Math.ceil((timers[timerAPKey] + apRecoverInterval - now) / 60000);
                msg += `现在体力${user.rpgap}/${maxAp}。`;
                if (user.rpgap < maxAp) {
                    msg += `下次恢复时间${nextTime}分钟后。`
                }
                return msg;
            }
        }
    }

    export function consumeAP(user: User.Observed<"rpgap">, ap: number): string {
        user.rpgap -= ap;
        return `体力-${ap}=${user.rpgap}。`;
    }
}