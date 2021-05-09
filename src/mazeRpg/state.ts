import { Session, Time } from "koishi";

export namespace State {
    export const active = 0x1;
    export const inMaze = 0x2;

    const StateDismatchString: Record<number, [string, string]> = {
        [active]: ["角色未初始化，请使用start <角色名>指令创建新人物。", "已有角色存在。"],
        [inMaze]: ["角色不在迷宫中，请使用进入迷宫指令进入迷宫。", "已在迷宫中。"]
    }

    export function checkState(state: number | undefined, target: number | Record<number, boolean>): string | undefined {
        if (state == null) {
            state = 0;
        }
        if (typeof target === "number") {
            if (hasState(state, target)) {
                return undefined;
            }
            for (const [key, msgs] of Object.entries(StateDismatchString)) {
                const checkState = Number(key);
                if (hasState(target, checkState) && !hasState(state, checkState)) {
                    return msgs[0];
                }
            }
        } else {
            for (const [targetState, targetValue] of Object.entries(target)) {
                const checkState = Number(targetState);
                const checkResult = hasState(state, checkState);
                if (checkResult !== targetValue) {
                    return targetValue ? StateDismatchString[checkState][0] : StateDismatchString[checkState][1];
                }
            }
        }
        return undefined;
    }

    export function hasState(state: number, target: number): boolean {
        return (state & target) === target;
    }

    export function stateChecker(target: number | Record<number, boolean> = active) {
        return ({ session }: { session?: Session<"rpgstate"> | undefined }) => {
            return checkState(session?.user?.rpgstate, target);
        }
    }


    const timerAPKey = "rpgap";
    const apRecoverInterval = 4 * Time.hour;
    const initialAp = 1;
    const maxAp = 24;

    export function apChecker(defaultAp = 1, returnDetail = false) {
        return ({ session, options }: { session?: Session<"rpgap" | "timers"> | undefined, options?: { ap?: number } }) => {
            const target = options?.ap || defaultAp;
            const now = Date.now();
            const user = session?.user!;
            const timers = user.timers!;
            const apTimer = timers[timerAPKey];
            if (user.rpgap == null) {
                user.rpgap = initialAp;
            }
            if (apTimer == null) {
                timers[timerAPKey] = now;
                return;
            }
            const recoverAp = Math.floor((now - apTimer) / apRecoverInterval);
            if (recoverAp + user.rpgap >= maxAp) {
                user.rpgap = maxAp;
                timers[timerAPKey] = now;
            } else if (recoverAp > 0) {
                user.rpgap += recoverAp;
                timers[timerAPKey] = apTimer + recoverAp * apRecoverInterval;
            }
            if (user.rpgap < target || returnDetail) {
                let msg = "";
                if (user.rpgap < target) {
                    msg += `体力不够呢。`;
                }
                const nextTime = Math.ceil((apTimer + apRecoverInterval - now) / 60000);
                msg += `现在体力${user.rpgap}/${maxAp}。`;
                if (user.rpgap < maxAp) {
                    msg += `下次恢复时间${nextTime}分钟后。`
                }
                return msg;
            }
        }
    }

}