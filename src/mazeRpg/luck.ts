import { Context, Random } from "koishi";
import { Item } from "./item";

export const probabilities: Record<Item.RarityKey, number> = {
    N: 800,
    R: 100,
    SR: 50,
    SSR: 5,
    Unq: 0,
    Other: 0,
}

function apply(ctx: Context) {
    ctx.command('rpg/luck ', '每日抽卡', { maxUsage: 1 })
        .userFields(["rpgitems", "money"])
        .adminUser(({ session, target }) => {
            if (session?.user?.rpgitems == null) {
                session!.user!.rpgitems = {};
            }
            const bag = session!.user!.rpgitems;
            const canItems = Item.data[Random.weightedPick(probabilities)];
            if (canItems.length > 0) {
                const item = Random.pick(canItems);
                if (item !== null && item.lottery) {
                    return Item.gain(bag, [[item, 1]]);
                }
            }
            const luckMoney = Random.int(10, 1000);
            target.money += luckMoney;
            return `你获得了${luckMoney}金币`;
        });
}

export const RPGLuck = {
    name: "rpgLuck",
    apply
}