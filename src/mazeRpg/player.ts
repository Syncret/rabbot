import { Context, Random } from "koishi";
import { Appearance, Status } from "./database";
import { State } from "./state";
import { getDiceMsg } from "./util";

export namespace Player {
    export const ColorText = ["白", "黑", "银", "红", "蓝", "绿", "黄", "紫", "粉", "橙", "灰", "金", "虹",
        "玫瑰", "琥珀", "天青", "翡翠", "琉璃"];
    export const HairType = ["双马尾", "单马尾", "长发", "短发", "双麻花辫", "卷发", "碎发", "大波浪"];

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
            status: 0,
        }
    };

    export function apply(ctx: Context) {
        const { database } = ctx;
        ctx.command("rpg/player", "角色相关指令");
        ctx.command("rpg/player/status", "查看状态")
            .userFields(["rpgstatus", "rpgname", "rpgstate", "timers", "rpgap"])
            .check(State.stateChecker())
            .action(({ session }) => {
                const user = session!.user!;
                const apMsg = State.apChecker(false, true)({ session, options: { ap: 0 } });
                return `${user.rpgname}: ${describeStatus(user.rpgstatus)}\n${apMsg}${State.describeState(user.rpgstate)}`;
            });
        ctx.command("rpg/player/appearance", "查看外观")
            .userFields(["appearance", "rpgname", "rpgstate", "rpgstatus", "timers"])
            .check(State.stateChecker())
            .action(({ session }) => {
                const user = session!.user!;
                return `${user.rpgname}${describeAppearance(user.appearance, user.rpgstatus)}${State.describeState(user.rpgstate)}`;
            });
        ctx.command("rpg/player/escape <ap:number>", "消耗一定体力掷1-体力的骰子来挣脱陷阱")
            .option("ap", "-a <ap:number> 指定消耗的体力")
            .userFields(["rpgstate", "rpgstatus", "rpgap", "timers", "mazecellid"])
            .check(State.stateChecker(State.tentacle))
            .check(State.apChecker(true))
            .action(async ({ session, options = {} }, ap) => {
                const user = session?.user!;
                const dice = Random.int(ap) + 1;
                ap = ap || options.ap || 0;
                if (!ap) {
                    return "请指定消耗的体力来确定掷骰大小。"
                }
                let msg = getDiceMsg(dice, ap, user.rpgstatus.rpgdice!);
                if (dice >= user.rpgstatus.rpgdice!) {
                    msg += `成功了！你从触手中挣脱了出来！`;
                    user.rpgstate ^= State.tentacle;
                } else {
                    msg += `你费尽了力气, 然而还是被触手紧紧地缠绕着。`
                }
                msg += State.consumeAP(user, ap);
                return msg;
            });
    }

}
