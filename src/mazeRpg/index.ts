import { Context } from "koishi";
import { RPGLuck } from "./luck";
import { rpgFields, Status } from "./database";
import { Player } from "./player";
import { Item } from "./item";
import { State } from "./state";
import { min } from "./util";
import { RPGMaze } from "./maze";

export interface Config {

}

export function apply(ctx: Context, config?: Config) {
    ctx.command("rpg", "Maze RPG");
    ctx.plugin(RPGLuck);
    ctx.plugin(Player);
    ctx.plugin(Item.itemPlugin);
    ctx.plugin(RPGMaze);

    ctx.command("rpg/start <name:string>", "开始")
        .userFields(rpgFields)
        .check(State.stateChecker())
        .action(async ({ session, options }, name) => {
            const user = session?.user!;
            if (!name) {
                return "需要指定新角色的名字。";
            }
            if (name.length > 10) {
                return "太长啦，名字不能超过10个字符。"
            }
            if (/[#]/.test(name)) {
                return "名字里不能有#等字符呢。"
            }
            user.rpgstate = State.active;
            user.rpgname = name;
            user.appearance = Player.generateAppearance();
            user.rpgstatus = Player.createNewPlayer();
            user.rpgrecords = { visited: [], logs: [] };
            if (user.money == null) {
                user.money = 0;
            }
            if (user.rpgitems == null) {
                user.rpgitems = {};
            }
            user.rpgstate = State.active;
            return `你叫${name}, 你${Player.describeAppearance(user.appearance)}你的冒险旅程现在开始了!`;
        });

    ctx.command("rpg/end <name:string>", "结束")
        .userFields(rpgFields)
        .option("keep", "-k 保留道具和金钱等")
        .check(State.stateChecker())
        .action(async ({ session, options }, name: string | undefined) => {
            const user = session?.user!;
            const status = user.rpgstatus;
            if (!name) {
                session?.sendQueued("真的要结束吗, 道具和等级都会清空哦。输入你的名字确认结束:");
                name = await session?.prompt(30 * 1000);
            }
            if (user.rpgname !== name) {
                return "名字对不上呢";
            }
            user.mazecellid = 0;
            if (!options?.keep) {
                user.money = 0;
                user.rpgitems = {};
                user.rpgstate = 0x0;
            }
            user.rpgname = "";
            return `${name}结束了她的冒险生活...`;
        });

    ctx.command("rpg/reset", "修复或重置角色状态")
        .userFields(rpgFields)
        .adminUser(({ target, session }) => {
            const user = target;
            if (user.rpgstatus) {
                user.rpgstate = 1;
            }
            if (user.rpgitems) {
                Object.entries(user.rpgitems).forEach(([key, value]) => {
                    if (typeof key !== "string" || Item.data[key] == null) {
                        delete user.rpgitems[key];
                    }
                });
            }
            return `修复完毕`;
        });
    ctx.command("rpg/updatedatabase", "更新数据库结构", { authority: 3, hidden: true })
        .action(async ({ session, options }) => {
            const mysql = ctx.database.mysql;
            const users: Array<{ id: string, rpgrecords: any, rpgstatus: Status }> = await ctx.database.mysql.query("select id, rpgrecords from user where mazecellid > 63;");
            const query = users.map((user) => {
                if (user.rpgrecords) {
                    user.rpgrecords.visited = [];
                }
                return `update user set rpgrecords = '${JSON.stringify(user.rpgrecords)}' where id = ${user.id};`
            }).filter((s) => !!s);
            await ctx.database.mysql.query(query);
            return `更新完毕`;
        });
    ctx.command("rpg/item/bag", "查看背包")
        .userFields(["rpgitems", "money", "rpgstate", "timers"])
        .check(State.stateChecker())
        .option("detail", "-d 显示物品详细")
        .action(async ({ session, options }) => {
            let msg = Item.viewBag(session!, options?.detail);
            msg += Item.checkBagFull(session!.user!.rpgitems);
            return msg;
        });
    ctx.command("rpg/state", "检查状态")
        .userFields(["rpgstate"])
        .action(({ session }) => {
            const state = session!.user!.rpgstate;
            return state + "";
        });

    ctx.command("rpg/use <name:string>", "使用/装备道具")
        .userFields(["rpgitems", "rpgstatus", "rpgstate", "timers"])
        .check(State.stateChecker())
        .action(async ({ session }, name) => {
            const user = session!.user!;
            const userStatus = user.rpgstatus;
            const userItems = user.rpgitems;
            const itemCount = userItems && userItems[name];
            if (itemCount == null || itemCount <= 0) {
                return "你没有此物品。";
            }
            const item = Item.data[name];
            if (item == null) {
                delete user.rpgitems[item];
                return "找不到物品";
            }
            let backItem: string = "";
            let msg = "";
            switch (item.type) {
                case Item.ItemType.Weapon:
                    if (userStatus.weapon) {
                        backItem = userStatus.weapon;
                        msg += `换下了${backItem}, `;
                    }
                    userStatus.weapon = item.name;
                    msg = `你${msg}装备上了${item.name}。`
                    break;
                case Item.ItemType.Armor:
                    if (userStatus.armor) {
                        backItem = userStatus.armor;
                        msg += `脱下了${backItem}, `;
                    }
                    userStatus.armor = item.name;
                    msg = `你${msg}穿上了${item.name}。`
                    break;
                case Item.ItemType.Accessory:
                    if (userStatus.accessory) {
                        backItem = userStatus.accessory;
                        msg += `摘下了${backItem}, `;
                    }
                    userStatus.accessory = item.name;
                    msg = `你${msg}戴上了${item.name}。`
                    break;
                case Item.ItemType.Consumable:
                    const titem = item as Item.ConsumableItem;
                    switch (titem.subType) {
                        case Item.CsmType.HP:
                            userStatus.hp = min(userStatus.hp + item.effect, Player.maxHp(userStatus));
                            msg += `你恢复了${item.effect}点生命`;
                            break;
                        case Item.CsmType.MP:
                            userStatus.mp = min(userStatus.mp + item.effect, Player.maxMp(userStatus));
                            msg += `你恢复了${item.effect}点魔力`;
                            break;
                        case Item.CsmType.HPMP:
                            userStatus.hp = min(userStatus.hp + item.effect, Player.maxHp(userStatus));
                            userStatus.mp = min(userStatus.mp + item.effect, Player.maxMp(userStatus));
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

export const name = "MazeRpg";