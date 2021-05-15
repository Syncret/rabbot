import { Context, Random } from "koishi";
import { Room } from "./room";
import { State } from "./state";
import { min } from "./util";

export namespace Player {
    export const ColorText = ["白", "黑", "银", "红", "蓝", "绿", "黄", "紫", "粉", "橙", "灰", "金", "虹",
        "玫瑰", "琥珀", "天青", "翡翠", "琉璃"];
    export const HairType = ["双马尾", "单马尾", "长发", "短发", "双麻花辫", "卷发", "碎发", "大波浪"];

    export type Appearance = {
        hairColor: string,
        hairType: string,
        eyeColor: string,
        height: number,
    };
    export type PlayRecords = {
        visited: number[];
        logs: string[];
    }

    export type Status = {
        level: number,
        exp: number,
        hp: number,
        mp: number,
        phase: number,
        status: number,
        weapon?: string,
        armor?: string,
        accessory?: string,
    }
    export function maxHp(status: Status): number {
        return status.level * 10 + 90;
    }
    export function maxMp(status: Status): number {
        return status.level * 10 + 90;
    }
    export function maxExp(status: Status): number {
        return status.level * 100;
    }

    export function generateAppearance(): Appearance {
        return {
            hairColor: Random.pick(ColorText),
            hairType: Random.pick(HairType),
            eyeColor: Random.pick(ColorText),
            height: Random.int(130, 185),
        }
    }

    export function describeAppearance(apperance: Appearance, status?: Status): string {
        let clothing = "";
        if (status?.armor) {
            clothing += `穿着一件${status.armor}, `;
        }
        if (status?.weapon) {
            clothing += `手里拿着${status.weapon}, `;
        }
        if (status?.accessory) {
            clothing += `戴着${status.accessory}, `;
        }
        return `身高${apperance.height}, ${clothing}有着${apperance.eyeColor}色的眼睛, 梳着${apperance.hairColor}色的${apperance.hairType}。`;
    };
    export function describeStatus(status: Status): string {
        return `等级${status.level}, 经验${status.exp}/${maxExp(status)}, `
            + `生命${status.hp}/${maxHp(status)}, 魔力${status.mp}/${maxMp(status)}, `
            + `武器${status.weapon || "无"}, 穿着${status.armor || "无"}, 饰品${status.accessory || "无"}。`
    };
    export function createNewPlayer(): Status {
        return {
            level: 1,
            exp: 0,
            hp: 100,
            mp: 100,
            phase: 0,
            status: 0,
        }
    };

    export function apply(ctx: Context) {
        const { database } = ctx;
        ctx.command("rpg/status", "查看状态")
            .userFields(["rpgstatus", "rpgname", "rpgstate", "timers", "rpgap"])
            .check(State.stateChecker())
            .action(({ session }) => {
                const user = session!.user!;
                const apMsg = State.apChecker(0, true)({ session });
                return `${user.rpgname}: ${describeStatus(user.rpgstatus)}\n${apMsg}`;
            });
        ctx.command("rpg/appearance", "查看外观")
            .userFields(["appearance", "rpgname", "rpgstate", "rpgstatus", "timers"])
            .check(State.stateChecker())
            .action(({ session }) => {
                const user = session!.user!;
                return `${user.rpgname}${describeAppearance(user.appearance, user.rpgstatus)}`;
            });
        ctx.command("rpg/rest <ap:number>", "休息")
            .option("ap", "-a <ap:number> 指定消耗的体力")
            .userFields(["rpgstate", "rpgstatus", "rpgap", "timers", "mazecellid"])
            .check(State.stateChecker(State.inMaze))
            .check(State.apChecker())
            .action(async ({ session, options = {} }, ap) => {
                const user = session?.user!;
                ap = ap || options.ap || 1;
                const cell = await database.getCellById(user.mazecellid, ["mazeId", "cell", "room"]);
                const room = Room.RoomRegistry[cell.room];
                let msg = "";
                let coefficient = 1;
                if (room.type !== "rest") {
                    msg += `附近的环境令你感到不安，你勉勉强强地休息了一阵。`;
                } else {
                    msg += `附近的环境令你感到放松，你舒服地休息了一阵！`;
                    coefficient = room.effect || 10;
                }
                msg += `你恢复了${ap * coefficient}点生命与魔力。`
                msg += State.consumeAP(user, ap);
                user.rpgstatus.hp = min(user.rpgstatus.hp + ap * coefficient, maxHp(user.rpgstatus));
                user.rpgstatus.mp = min(user.rpgstatus.mp + ap * coefficient, maxMp(user.rpgstatus));
                return msg;
            });
    }

}
