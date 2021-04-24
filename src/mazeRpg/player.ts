import { Context, Random } from "koishi";
import { State } from "./state";

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

    export type Status = {
        name: string,
        level: number,
        exp: number,
        hp: number,
        mp: number,
        ap: number,
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
        return `${status.name}: 等级${status.level}, 经验${status.exp}/${maxExp(status)}, `
            + `生命${status.hp}/${maxHp(status)}, 魔力${status.mp}/${maxMp(status)}, `
            + `体力${status.ap}/24, 武器${status.weapon || "无"}, 穿着${status.armor || "无"}, 饰品${status.accessory || "无"}。`
    };
    export function createNewPlayer(name: string): Status {
        return {
            name,
            level: 1,
            exp: 0,
            hp: 100,
            mp: 100,
            ap: 10,
            phase: 0,
            status: 0,
        }
    };

    export function apply(ctx: Context) {
        ctx.command("rpg/status", "查看状态")
            .userFields(["rpgstatus", "rpgstate"])
            .check(State.stateChecker())
            .action(({ session }) => {
                return `${describeStatus(session!.user!.rpgstatus)}`;
            });
        ctx.command("rpg/appearance", "查看外观")
            .userFields(["appearance", "rpgstate", "rpgstatus"])
            .check(State.stateChecker())
            .action(({ session }) => {
                const status=session!.user!.rpgstatus;
                return `${status.name}${describeAppearance(session!.user!.appearance, status)}`;
            });
    }

}
