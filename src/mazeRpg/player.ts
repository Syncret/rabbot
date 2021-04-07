import { Context, Random } from "koishi";

export namespace Player {
    export const ColorText = ["白", "黑", "银", "红", "蓝", "绿", "黄", "紫", "粉", "橙", "灰",
        "玫瑰", "琥珀", "天青", "翡翠", "虹"];
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
        accessary?: string,
    }
    export const State = {
        bagFull: 0x1,
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
        let cloting = status && [status.armor && `穿着一件${status.armor}`, status.weapon && `拿着${status.armor}`].filter((s) => !!s).join(", ");
        return `身高${apperance.height}, 有着${apperance.eyeColor}色的眼睛, 梳着${apperance.hairColor}色的${apperance.hairType}
        ${cloting ? `, ${cloting}` : ""}。`;
    };
    export function describeStatus(status: Status): string {
        return `${status.name}: 等级${status.level}, 经验${status.exp}/${maxExp(status)}, `
            + `生命${status.hp}/${maxHp(status)}, 魔力${status.mp}/${maxMp(status)}, `
            + `体力${status.ap}/24, 武器${status.weapon || "无"}, 穿着${status.armor || "无"}。`
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
            .userFields(["rpgstatus"])
            .action(({ session }) => {
                if (session?.user?.rpgstatus == null) {
                    return "没有记录呢";
                }
                return `${describeStatus(session.user.rpgstatus)}`;
            });
        ctx.command("rpg/appearance", "查看外观")
            .userFields(["appearance", "rpgstatus"])
            .action(({ session }) => {
                if (session?.user?.appearance == null) {
                    return "没有记录呢";
                }
                return `你${describeAppearance(session.user.appearance, session.user.rpgstatus)}`;
            });
    }

}