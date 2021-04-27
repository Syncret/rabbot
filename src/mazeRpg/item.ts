import { Context, isInteger, Random, Session } from "koishi";
import { State } from "./state";
import { getEnumKeys, min } from "./util";

export namespace Item {
    export enum Rarity { N, R, SR, SSR, Unq, Other }
    export type RarityKey = keyof typeof Rarity;
    export enum ItemType { Weapon, Armor, Accessory, Consumable, }
    export const maxBagSize = 10;
    export const extraBagSize = 3; // max weapon/armor count of single type
    type Bag = Record<string, number | undefined>;

    export interface ItemBase {
        type: ItemType,
        name: string,
        description?: string,
        effect: number,
        lottery: boolean,
        price: number,
        rarity: Rarity
    }
    export interface ItemTypeMetadata<T extends ItemBase> {
        name: string;
        getItemEffectString: (item: T) => string;
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
        ["武士刀", Rarity.R, WpType.Short, 30],
        ["太刀", Rarity.SR, WpType.Short, 40],
        ["短剑", Rarity.N, WpType.Short, 15],
        ["长剑", Rarity.N, WpType.Short, 25],
        ["大剑", Rarity.R, WpType.Short, 40],
        ["巨剑", Rarity.SR, WpType.Short, 50],
        ["圣剑", Rarity.SSR, WpType.Short, 60],
        ["咖喱棒", Rarity.SSR, WpType.Short, 70, false],
        ["短棍", Rarity.N, WpType.Short, 15],
        ["双截棍", Rarity.R, WpType.Short, 25],
        ["长枪", Rarity.R, WpType.Short, 30],
        ["拳套", Rarity.N, WpType.Short, 25],
        ["触手", Rarity.R, WpType.Short, 40],
        ["弹弓", Rarity.N, WpType.Long, 5],
        ["长弓", Rarity.N, WpType.Long, 15],
        ["手枪", Rarity.N, WpType.Long, 10],
        ["步枪", Rarity.R, WpType.Long, 20],
        ["突击枪", Rarity.R, WpType.Long, 30],
        ["狙击枪", Rarity.SR, WpType.Long, 40],
        ["法杖", Rarity.N, WpType.Magic, 20],
        ["魔导书", Rarity.N, WpType.Magic, 30],
    ];
    export const weaponItems = weaponItemArgs.map((a) => createWeaponItem(...a));
    const WeaponTypeMetadata: ItemTypeMetadata<WeaponItem> = {
        name: "武器",
        getItemEffectString: (item: WeaponItem) => {
            switch (item.subType) {
                case WpType.Short:
                    return `攻击+${item.effect}, 距离近`;
                case WpType.Long:
                    return `攻击+${item.effect}, 距离远`;
                case WpType.Magic:
                    return `魔攻+${item.effect}, 距离远`;
                default:
                    return `效果不明！`;
            }
        }
    };

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
        ["体操服"], ["泳衣"], ["衬衣"], ["运动衫"], ["绷带"], ["肚兜"],
        ["内衣", Rarity.R, AmType.Normal, 5],
        ["比基尼", Rarity.R],
        ["布偶装", Rarity.R],
        ["护士服", Rarity.R],
        ["连衣裙", Rarity.R],
        ["女仆裙", Rarity.R],
        ["JK服", Rarity.R],
        ["LO裙", Rarity.R],
        ["巫女服", Rarity.R],
        ["盔甲", Rarity.R],
        ["兔女郎服", Rarity.R],
        ["浴衣", Rarity.R],
        ["死库水", Rarity.R],
        ["和服", Rarity.R],
        ["情趣衣", Rarity.R],
        ["花嫁衣", Rarity.R],
        ["触手服", Rarity.SR],
        ["战斗服", Rarity.SR],
        ["魔法少女服", Rarity.SR],
        ["长袍", , AmType.Magic],
    ];
    export const armorItems = armorItemArgs.map((a) => createArmorItem(...a));
    const ArmorTypeMetadata: ItemTypeMetadata<ArmorItem> = {
        name: "衣服",
        getItemEffectString: (item: ArmorItem) => {
            switch (item.subType) {
                case AmType.Normal:
                    return `防御+${item.effect}`;
                case AmType.Magic:
                    return `魔防+${item.effect}`;
                default:
                    return `效果不明！`;
            }
        }
    };

    export enum AcsType { DEF, ATK, }
    export interface AccessoryItem extends ItemBase {
        type: ItemType.Accessory,
        subType: AcsType,
    }
    function createAccessoryItem(name: string, rarity: Rarity = Rarity.N, subType: AcsType = AcsType.DEF,
        effect?: number, lottery: boolean = true, price?: number, description?: string) {
        effect = effect == null ? rarity * 10 + 5 : effect;
        price = price == null ? effect * 100 : price;
        const item = {
            type: ItemType.Accessory,
            name, rarity, lottery, effect, price, description,
            subType,
        };
        createItemBase(item);
    }
    type AccessoryArgs = Parameters<typeof createAccessoryItem>;
    export const accessoryItemArgs: AccessoryArgs[] = [
        ["猫耳"], ["兔耳"], ["蝴蝶结"], ["太阳帽"],
        ["眼镜"], ["泳镜"], ["太阳镜"],
        ["猫尾", Rarity.N, AcsType.ATK],
        ["青蛙发夹", Rarity.N, AcsType.ATK],
        ["星之耳钉", Rarity.R, AcsType.ATK],
        ["月之耳坠", Rarity.R, AcsType.DEF],
        ["日之耳环", Rarity.R, AcsType.ATK, 20],
        ["六花的眼罩", Rarity.R, AcsType.ATK],
    ];
    export const accessoryItems = accessoryItemArgs.map((a) => createAccessoryItem(...a));
    const AccessoryTypeMetadata: ItemTypeMetadata<AccessoryItem> = {
        name: "饰品",
        getItemEffectString: (item: AccessoryItem) => {
            switch (item.subType) {
                case AcsType.DEF:
                    return `防御+${item.effect}`;
                case AcsType.ATK:
                    return `攻击+${item.effect}`;
                default:
                    return `效果不明！`;
            }
        }
    };

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
    const ConsumableTypeMetadata: ItemTypeMetadata<ConsumableItem> = {
        name: "消耗品",
        getItemEffectString: (item: ConsumableItem) => {
            switch (item.subType) {
                case CsmType.HP:
                    return `生命+${item.effect}`;
                case CsmType.MP:
                    return `魔力+${item.effect}`;
                case CsmType.HPMP:
                    return `生命与魔力+${item.effect}`;
                default:
                    return `效果不明！`;
            }
        }
    };

    export const ItemMetadata: Record<ItemType, ItemTypeMetadata<any>> = {
        [ItemType.Weapon]: WeaponTypeMetadata,
        [ItemType.Armor]: ArmorTypeMetadata,
        [ItemType.Accessory]: AccessoryTypeMetadata,
        [ItemType.Consumable]: ConsumableTypeMetadata,
    };


    export function gain(bag: Bag, items: [ItemBase, number][]): string {
        let msg = "";
        let itemMsg: string[] = [];
        items.forEach((itemE) => {
            const item = itemE[0];
            let count = itemE[1];
            if (count !== 0) {
                bag[item.name] = (bag[item.name] || 0) + count;
                itemMsg.push(`${item.name}*${count}`);
            }
        });
        msg += `你获得了${itemMsg.join(", ")}!`;
        msg += checkBagFull(bag);
        return msg;
    }

    export function discardItems(session: Session<"rpgitems">, items: string[]): string {
        let msg = "";
        let itemThrow: string[] = [];
        let itemNotFound: string[] = [];
        items.forEach((item) => {
            if (session.user?.rpgitems[item] != null) {
                delete session.user?.rpgitems[item];
                itemThrow.push(item);
            } else {
                itemNotFound.push(item);
            }
        });
        if (itemNotFound.length > 0) {
            msg += `找不到物品${itemNotFound.join(", ")}。`
        }
        if (itemThrow.length > 0) {
            msg += `你扔掉了${itemThrow.join(", ")}。`;
        }
        return msg;
    }

    export function sellItems(bag: Bag, toSellItems: [ItemBase, number][]): number {
        let money = 0;
        toSellItems.forEach((toSellItem) => {
            const [item, itemCount] = toSellItem;
            if (itemCount > 0) {
                const curItemCount = bag[item.name] || 0;
                const toSellCount = min(curItemCount, itemCount);
                money += Math.floor(item.price * toSellCount / 10);
                if (curItemCount - toSellCount > 0) {
                    bag[item.name] = curItemCount - toSellCount;
                } else {
                    delete bag[item.name];
                }
            }
        });
        return money;
    }

    export function checkBagFull(items: Bag): string {
        const itemsArray = Array.from(Object.keys(items || {}));
        let itemCount = itemsArray.length;
        const itemMsg = [];
        let msg = "";
        while (itemCount > maxBagSize + extraBagSize) {
            const dItem = Random.pick(itemsArray);
            delete items[dItem];
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
                let imsg = `${name}*${Math.ceil(count || 0)}`;
                if (detail) {
                    const item = data[name];
                    if (item == null) {
                        delete items[name];
                        return "";
                    }
                    const meta = ItemMetadata[item.type];
                    if (item) {
                        imsg = `\n${imsg}: ${meta.name}, ${meta.getItemEffectString(item)}, 价格${item.price}${item.description ? ", " + item.description : ""}`;
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
            const string2ItemWithCount = (text: string, bag?: Bag) => {
                let notFoundItems: string[] = [];
                const validItems: [ItemBase, number][] = [];
                text.split(/,|，/).forEach((i) => {
                    const ia = i.trim().split("*");
                    if (bag && bag[ia[0]] == null) {
                        notFoundItems.push(ia[0]);
                        return;
                    };
                    const item = data[ia[0]];
                    if (item) {
                        validItems.push([item, Number(ia[1]) || 1]);
                    } else {
                        notFoundItems.push(ia[0]);
                    }
                });
                return {
                    notFoundItems,
                    validItems
                };
            }
            ctx.command("rpg.addItems <items:text>", "增加道具", { authority: 4, hidden: true })
                .userFields(["rpgitems"])
                .adminUser(({ target }, items) => {
                    if (items == null || items.length === 0) {
                        return "请输入物品名";
                    }
                    let msg = "";
                    const { notFoundItems, validItems } = string2ItemWithCount(items);
                    if (notFoundItems.length > 0) {
                        msg += `找不到物品${notFoundItems.join(", ")}, `;
                    }
                    if (validItems.length > 0) {
                        msg += gain(target.rpgitems, validItems);
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
                .userFields(["rpgitems", "rpgstate"])
                .check(State.stateChecker())
                .action(({ session }, items) => {
                    if (items == null || items.length === 0) {
                        return "请输入物品名";
                    }
                    const dItems = items.split(/,|，/).map((i) => i.trim());
                    return discardItems(session!, dItems);
                });
            ctx.command("rpg/sell <items:text>", "卖掉道具")
                .userFields(["rpgitems", "money", "rpgstate"])
                .check(State.stateChecker())
                .action(({ session }, items) => {
                    if (items == null || items.length === 0) {
                        return "请输入物品名";
                    }
                    const user = session?.user!;
                    const bag = user.rpgitems;
                    let msg = "";
                    const { notFoundItems, validItems } = string2ItemWithCount(items, bag);
                    if (notFoundItems.length > 0) {
                        msg += `找不到物品${notFoundItems.join(", ")}, `;
                    }
                    if (validItems.length > 0) {
                        const money = sellItems(bag, validItems);
                        user.money = user.money + money;
                        msg += `你卖掉了${validItems.map(([item, count]) => `${item.name}*${count}`).join(", ")}, 获得了${money}金币!`;
                    }
                    return msg;
                });
        }
    }
}