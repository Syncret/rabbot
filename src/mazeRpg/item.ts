import { Context, isInteger, Random, Session } from "koishi";
import { getEnumKeys } from "./util";

export namespace Item {
    export enum Rarity { N, R, SR, SSR, Unq, Other }
    export type RarityKey = keyof typeof Rarity;
    export enum ItemType { Weapon, Armor, Accessory, Consumable, Quest, }
    export const maxBagSize = 30;
    export const extraBagSize = 10; // max weapon/armor count of single type

    export interface ItemBase {
        type: ItemType,
        name: string,
        description?: string,
        effect: number,
        lottery: boolean,
        price: number,
        rarity: Rarity
    }

    type Data = Record<string, ItemBase> & ItemBase[] & Record<RarityKey, ItemBase[]>;

    export const data: Data = [] as any;
    getEnumKeys(Rarity).forEach((key) => {
        data[key] = [];
    });

    function createItemBase<T extends ItemType>(base: {
        type: T, name: string, rarity: Rarity,
        lottery: boolean, effect: number, price: number, description?: string
    }) {
        const item = base;
        data[Rarity[item.rarity] as RarityKey].push(item);
        data[item.name] = item;
        data.push(item);
        return item;
    }

    // Weapon
    export enum WpType { Short, Long, Magic, }
    export interface WeaponItem extends ItemBase {
        type: ItemType.Weapon,
        subType: WpType,
    }
    function createWeaponItem(name: string, rarity: Rarity = Rarity.N, subType: WpType = WpType.Short,
        effect?: number, lottery: boolean = true, price?: number, description?: string) {
        effect = effect == null ? rarity * 10 + 10 : effect;
        price = price == null ? effect * 100 : price;
        const item = {
            type: ItemType.Weapon,
            name, rarity, lottery, effect, price, description,
            subType,
        };
        createItemBase(item);
    }
    type WeaponArgs = Parameters<typeof createWeaponItem>;
    const weaponItemArgs: WeaponArgs[] = [
        ["小刀"],
        ["刀", Rarity.N, WpType.Short, 20],
        ["武士刀", Rarity.R, WpType.Short, 40],
        ["太刀", Rarity.SR, WpType.Short, 60],
        ["短剑", Rarity.N, WpType.Short, 15],
        ["长剑", Rarity.N, WpType.Short, 25],
        ["大剑", Rarity.R, WpType.Short, 40],
        ["巨剑", Rarity.SR, WpType.Short, 100],
        ["短棍", Rarity.N, WpType.Short, 15],
        ["长枪", Rarity.R, WpType.Short, 30],
        ["弹弓", Rarity.N, WpType.Long, 5],
        ["长弓", Rarity.N, WpType.Long, 15],
        ["手枪", Rarity.N, WpType.Long, 20],
        ["突击枪", Rarity.R, WpType.Long, 40],
        ["狙击枪", Rarity.SR, WpType.Long, 60],
        ["法杖", Rarity.N, WpType.Magic, 20],
    ];
    export const weaponItems = weaponItemArgs.map((a) => createWeaponItem(...a));

    // Armor
    export enum AmType { Normal, Magic, }
    export interface ArmorItem extends ItemBase {
        type: ItemType.Armor,
        subType: AmType,
    }
    function createArmorItem(name: string, rarity: Rarity = Rarity.N, subType: AmType = AmType.Normal,
        effect?: number, lottery: boolean = true, price?: number, description?: string) {
        effect = effect == null ? rarity * 10 + 10 : effect;
        price = price == null ? effect * 100 : price;
        const item = {
            type: ItemType.Armor,
            name, rarity, lottery, effect, price, description,
            subType,
        };
        createItemBase(item);
    }
    type ArmorArgs = Parameters<typeof createArmorItem>;
    export const armorItemArgs: ArmorArgs[] = [
        ["体操服"], ["泳衣"], ["衬衣"], ["运动衫"],
        ["内衣", Rarity.R, 5],
        ["比基尼", Rarity.R],
        ["JK服", Rarity.R],
        ["LO裙", Rarity.R],
        ["巫女服", Rarity.R],
        ["盔甲", Rarity.R],
        ["触手服", Rarity.R],
        ["长袍", , AmType.Magic],
    ];
    export const armorItems = armorItemArgs.map((a) => createArmorItem(...a));

    // Consumable
    export enum CsmType { HP, MP, HPMP, Other }
    export interface ConsumableItem extends ItemBase {
        type: ItemType.Consumable,
        subType: CsmType,
    }
    function createConsumableItem(name: string, subType: CsmType, effect: number, rarity: Rarity = Rarity.N,
        price?: number, lottery: boolean = true, description?: string) {
        price = price == null ? effect * 10 : price;
        const item = {
            type: ItemType.Consumable,
            name, rarity, lottery, effect, price, description,
            subType,
        };
        createItemBase(item);
    }
    type ConsumableArgs = Parameters<typeof createConsumableItem>;
    export const consumableItemArgs: ConsumableArgs[] = [
        ["HP药剂小", CsmType.HP, 20, Rarity.N],
        ["HP药剂中", CsmType.HP, 50, Rarity.R],
        ["HP药剂大", CsmType.HP, 100, Rarity.SR],
        ["MP药剂小", CsmType.MP, 20, Rarity.N],
        ["MP药剂中", CsmType.MP, 50, Rarity.R],
        ["MP药剂大", CsmType.MP, 100, Rarity.SR],
        ["能量饮料", CsmType.HPMP, 20, Rarity.N, 300],
        ["牛奶", CsmType.HPMP, 50, Rarity.R, 700],
        ["圣水", CsmType.HPMP, 100, Rarity.SR, 700],
    ];
    export const consumableItems = consumableItemArgs.map((a) => createConsumableItem(...a));


    export function gain(session: Session<"rpgitems">, items: [ItemBase, number][]): string {
        let msg = "";
        let itemMsg: string[] = [];
        if (session.user!.rpgitems == null) {
            session.user!.rpgitems = {};
        }
        items.forEach((itemE) => {
            const item = itemE[0];
            let count = itemE[1];
            if (count !== 0) {
                session.user!.rpgitems[item.name] = (session.user!.rpgitems[item.name] as number || 0) + count;
                itemMsg.push(`${item.name}*${count}`);
            }
        });
        msg += `你获得了${itemMsg.join(", ")}!`;
        msg += checkBagFull(session);
        return msg;
    }

    export function discardItems(session: Session<"rpgitems">, items: string[]): string {
        let msg = "";
        let itemMsg: string[] = [];
        items.forEach((item) => {
            delete session.user?.rpgitems[item];
            itemMsg.push(item);
        });
        msg = `你扔掉了${itemMsg.join(", ")}。`;
        return msg;
    }

    export function checkBagFull(session: Session<"rpgitems">): string {
        const items = Array.from(Object.keys(session.user!.rpgitems));
        let itemCount = items.length;
        const itemMsg = [];
        let msg = "";
        while (itemCount > maxBagSize + extraBagSize) {
            const dItem = Random.pick(items);
            delete session.user?.rpgitems[dItem];
            itemMsg.push(`${dItem}`);
            itemCount--;
        }
        if (itemMsg.length > 0) {
            msg += `\n你的包包炸了！你丢失了${itemMsg.join(", ")}!`
        }
        if (itemCount > maxBagSize) {
            msg += `\n你的包包已经满了！请扔掉${itemCount - maxBagSize}件物品。`;
        }
        return msg;
    }

    export function viewBag(session: Session<"rpgitems" | "money">, detail?: boolean): string {
        if (session.user!.rpgitems == null) {
            session.user!.rpgitems = {};
        }
        const items = session.user!.rpgitems;
        const money = session.user?.money || 0;
        let msg = `你有${money}金币, `;
        const itemsArray = Object.entries(items || {});
        if (!itemsArray.length) {
            msg += "其他什么都没了呢。";
        } else {
            msg += itemsArray.map(([name, count]) => {
                let imsg = `${name}*${Math.ceil(count)}`
                if (detail) {
                    const item = data[name];
                    if (item) {
                        imsg = `\n${imsg}: 效果${item.effect}, 价格${item.price}, 类型${ItemType[item.type]}${item.description ? ", " + item.description : ""}`;
                    }
                }
                return imsg;
            }).join(", ");
            msg += "。";
        }
        return msg;
    }

    export const itemPlugin = {
        apply: (ctx: Context) => {
            ctx.command("rpg.addItems <items:text>", "增加道具", { authority: 4, hidden: true })
                .userFields(["rpgitems"])
                .action(({ session }, items) => {
                    if (items == null || items.length === 0) {
                        return "请输入物品名";
                    }
                    const aItems: [ItemBase, number][] = [];
                    let msg = "";
                    let notFoundItems: string[] = [];
                    items.split(",").forEach((i) => {
                        const ia = i.trim().split("*");
                        const item = data[ia[0]];
                        if (item) {
                            aItems.push([item, Number(ia[1]) || 1]);
                        } else {
                            notFoundItems.push(ia[0]);
                        }
                    });
                    if (notFoundItems.length > 0) {
                        msg += `找不到物品${notFoundItems.join()}`;
                    }
                    if (aItems.length > 0) {
                        msg += gain(session!, aItems);
                    }
                    return msg;
                });
            ctx.command("rpg.setMoney <money:number>", "修改金钱", { authority: 4, hidden: true })
                .userFields(["money"])
                .adminUser(({ target }, money = 0) => {
                    if (money == null) return "请输入金钱";
                    if (!isInteger(money) || money <= 0) return "参数错误。"
                    target.money = money;
                });
            ctx.command("rpg/discard <items:text>", "扔掉道具")
                .userFields(["rpgitems"])
                .action(({ session }, items) => {
                    if (items == null || items.length === 0) {
                        return "请输入物品名";
                    }
                    const dItems = items.split(",").map((i) => i.trim());
                    return discardItems(session!, dItems);
                });
        }
    }
}