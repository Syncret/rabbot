import { Context, isInteger } from "koishi";
import { RPGLuck } from "./luck";
import { rpgFields } from "./database";
import { Player } from "./player";
import { Item } from "./item";
import { Phase } from "./phase";
import { max } from "./util";

export interface Config {

}

function apply(ctx: Context, config?: Config) {
    ctx.command("rpg", "Maze RPG");
    ctx.plugin(RPGLuck);
    ctx.plugin(Player);
    ctx.plugin(Item.itemPlugin);

    ctx.command("rpg/start <name:string>", "开始")
        .option("clean", "-c 从头开始，不继承道具等")
        .userFields(rpgFields)
        .action(async ({ session, options }, name) => {
            const user = session?.user!;
            if (user?.rpgphase != null && user.rpgphase !== Phase.end) {
                return `之前的冒险还没结束呢!`;
            }
            if (!name) {
                session?.sendQueued("输出新角色的名字");
                const newname = await session?.prompt(30 * 1000);
                if (newname) {
                    name = newname;
                } else {
                    return "无效名字";
                }
            }
            user.rpgphase = Phase.idle;
            user.appearance = Player.generateAppearance();
            user.rpgstatus = Player.createNewPlayer(name);
            if (user.rpgitems == null) {
                user.rpgitems = {};
            }
            if (options?.clean) {
                user.money = 0;
                user.rpgitems = {};
            }
            return `你叫${name}, 你${Player.describeAppearance(user.appearance)}你的冒险旅程现在开始了!`;
        });

    ctx.command("rpg/end <name:string>", "结束")
        .userFields(["rpgstatus", "rpgphase"])
        .action(async ({ session, options }, name: string | undefined) => {
            const user = session?.user;
            if (user?.rpgstatus == null || !user?.rpgstatus.name) {
                return "你都没有开始过!";
            }
            const status = user.rpgstatus;
            if (!name) {
                session?.sendQueued("真的要结束吗, 输入名字结束");
                name = await session?.prompt(30 * 1000);
            }
            if (status.name !== name) {
                return "名字对不上呢";
            }
            user.rpgstatus = undefined;
            user.rpgphase = Phase.end;
            return `${name}结束了她的冒险生活...`;
        });
    ctx.command("rpg/bag", "查看背包")
        .userFields(["rpgitems", "money"])
        .option("detail", "-d 显示物品详细")
        .action(async ({ session, options }) => {
            let msg = Item.viewBag(session!, options?.detail);
            msg += Item.checkBagFull(session!);
            return msg;
        });

    ctx.command("rpg/use <name:string>", "使用/装备道具")
        .userFields(["rpgitems", "rpgstatus"])
        .action(async ({ session, options }, name) => {
            const user = session!.user!;
            const userStatus = user.rpgstatus;
            const userItems = user.rpgitems;
            if (userStatus?.name == null) {
                return "角色未初始化";
            }
            const itemCount = userItems && userItems[name];
            if (itemCount == null || itemCount <= 0) {
                return "你没有此物品";
            }
            const item = Item.data[name];
            let backItem: string = "";
            let msg = "";
            switch (item.type) {
                case Item.ItemType.Weapon:
                    if (userStatus.weapon) {
                        backItem = userStatus.weapon;
                        msg += `, 换下了${backItem}`;
                    }
                    userStatus.weapon = item.name;
                    msg = `你装备上了${item.name}${msg}。`
                    break;
                case Item.ItemType.Armor:
                    if (userStatus.armor) {
                        backItem = userStatus.armor;
                        msg += `, 脱下了${backItem}`;
                    }
                    userStatus.armor = item.name;
                    msg = `穿上了${item.name}${msg}。`
                    break;
                case Item.ItemType.Consumable:
                    const titem = item as Item.ConsumableItem;
                    switch (titem.subType) {
                        case Item.CsmType.HP:
                            userStatus.hp = max(userStatus.hp + item.effect, Player.maxHp(userStatus));
                            msg += `你恢复了${item.effect}点生命`;
                            break;
                        case Item.CsmType.MP:
                            userStatus.mp = max(userStatus.mp + item.effect, Player.maxMp(userStatus));
                            msg += `你恢复了${item.effect}点魔力`;
                            break;
                        case Item.CsmType.HPMP:
                            userStatus.hp = max(userStatus.hp + item.effect, Player.maxHp(userStatus));
                            userStatus.mp = max(userStatus.mp + item.effect, Player.maxMp(userStatus));
                            msg += `你恢复了${item.effect}点生命与魔力`;
                            break;
                    }
            }
            if (msg) {
                userItems[item.name]--;
                if (backItem) {
                    userItems[backItem] = (userItems[backItem] || 0) + 1;
                }
                if (userItems[item.name] === 0) {
                    delete userItems[item.name];
                }
            } else {
                msg = "此道具暂无法使用。";
            }
            return msg;
        });
}

export const MazeRpg = {
    name: "MazeRpg",
    apply
}