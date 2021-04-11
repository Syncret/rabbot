import { Session } from "koishi";

export enum Phase { idle, end };
export namespace State {
    export const active = 0x1;
    export const movable = 0x2;

    export function checkState(state: number | undefined, target: number): string | undefined {
        if (state == null) {
            state = 0;
        }
        if ((state & target) === target) {
            return undefined;
        }
        const mismatch = state ^ target;
        if (hasState(mismatch, active)) {
            return "角色未初始化，请使用start指令创建新人物。";
        }
        if (hasState(mismatch, movable)) {
            return "无法移动!";
        }
    }
    export function stateChecker(target = active) {
        return ({ session }: { session?: Session<"rpgstate"> | undefined }) => {
            return checkState(session?.user?.rpgstate, target);
        }
    }

    export function hasState(state: number, target: number): boolean {
        return (state & target) === target;
    }

}