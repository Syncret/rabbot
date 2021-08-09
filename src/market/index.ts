import { Context } from "koishi";
import { createStockBaseInfo, defaultStocks, StockBaseInfo } from "./stock";
import { initializeStockBaseInfoTable, UserStockTable } from "./database";
import { formatString, messages } from "./messages";
import { string2ItemWithCountArray } from "./util";
export interface Config {
    initialMoney?: number,
    stocks?: Record<string, string | Partial<StockBaseInfo>>,
}

export const stockBaseInfos: Record<string, StockBaseInfo> = {};

function filterValidStockNames<T>(items: Array<T>, getName: (item: T) => string) {
    const validItems: T[] = [];
    const invalidItems: T[] = [];
    let invalidItemsMsg = "";
    for (const item of items) {
        const name = getName(item);
        if (stockBaseInfos[name as string]) {
            validItems.push(item);
        } else {
            invalidItems.push(item);
        }
    }
    if (invalidItems.length > 0) {
        invalidItemsMsg = formatString(messages.itemNotFound, invalidItems.map((i) => getName(i)).join(","));
    }
    return {
        valid: validItems,
        invalid: invalidItems,
        invalidItemsMsg
    };
}

export function apply(ctx: Context, config?: Config) {
    const initialMoney = config?.initialMoney || 1000;
    const stocks = config?.stocks || defaultStocks;
    Object.entries(stocks).forEach(([id, info]) => {
        stockBaseInfos[id] = createStockBaseInfo(id, info);
    });
    initializeStockBaseInfoTable(stockBaseInfos);
    const rootCommand = ctx.command("market", messages.marketCommandDescription);
    const database = ctx.database;
    database.patchStockInfo(stockBaseInfos);
    rootCommand.subcommand("market.patchdatabase", "update database", { hidden: true })
        .action(async ({ }) => {
            const response = await database.patchStockInfo(stockBaseInfos);
            return JSON.stringify(response);
        });
    rootCommand.subcommand("marketinfo", messages.marketInfoDescription)
        .alias("市场")
        .userFields(["id", "money"])
        .action(async ({ session, options },) => {
            const infos = await database.getStockInfo();
            infos.map((info) => {
                const baseInfo = stockBaseInfos[info.id];
                let msg = "";
                if (baseInfo) {
                    let additionalMsg = "";
                    if (info.lastprice) {
                        const diff = info.lastprice / info.price - 1;
                        additionalMsg += `, ${diff >= 0 ? "↑" : "↓"}${Number(diff.toFixed(2))}`;
                    }
                    msg = `${baseInfo.name}元/${baseInfo.unit}: ${info.price}${additionalMsg};`
                }
                return msg;
            }).filter((m) => !!m);
            return infos.join(" ");
        });

    rootCommand.subcommand("buyin <items:text>", messages.buyinDescription)
        .alias("买入")
        .userFields(["id", "money"])
        .action(async ({ session, options }, text) => {
            try {
                let msg = "";
                const items = string2ItemWithCountArray(text);
                const validation = filterValidStockNames(items, (item) => item[0]);
                msg += validation.invalidItemsMsg;
                const stocks = validation.valid as Array<[string, number]>;
                const prices = await database.get("stockinfo", stocks.map((i) => i[0]), ["price"]);
                let cost = 0;
                const equations = prices.map((p, index) => {
                    const count = stocks[index][1];
                    cost += p.price * count;
                    return `${p.price}*${count}`;
                });
                const user = session?.user!;
                if (user.money == null) {
                    user.money = initialMoney;
                    msg += formatString(messages.initializeUserMoney, initialMoney);
                }
                if (user.money < cost) {
                    msg += formatString(messages.notEnoughMoney, cost, user.money);
                    return msg;
                }
                const currentUserStocks = await database.get("userstock", { id: [Number(user.id)] }, stocks.map((i) => i[0] as string));
                if (currentUserStocks.length > 0) {
                    const userStock = currentUserStocks[0];
                    stocks.forEach((item) => item[1] += userStock[item[0]]);
                }
                user.money -= cost;
                const query: Partial<UserStockTable> = { id: Number(user.id) };
                stocks.forEach((stock) => {
                    query[stock[0]] = stock[1];
                })
                await database.update("userstock", [query]);
                return formatString(messages.buyinStock, `${equations.join("+")}=${cost}`, stocks.map((i) => `${i[0]}*${i[1]}`).join(", "));
            } catch (e) {
                if (e.message) {
                    return e.message;
                }
                console.error(e);
            }
        });

    rootCommand.subcommand("sellout <items:text>", messages.selloutDescription)
        .alias("卖出")
        .userFields(["id", "money"])
        .action(async ({ session, options }, text) => {
            try {
                let msg = "";
                const items = string2ItemWithCountArray(text);
                const validation = filterValidStockNames(items, (item) => item[0]);
                msg += validation.invalidItemsMsg;
                const stocks = validation.valid as Array<[string, number]>;
                const prices = await database.get("stockinfo", stocks.map((i) => i[0]), ["price"]);
                let cost = 0;
                const equations = prices.map((p, index) => {
                    const count = stocks[index][1];
                    cost += p.price * count;
                    return `${p.price}*${count}`;
                });
                const user = session?.user!;
                if (user.money == null) {
                    user.money = initialMoney;
                    msg += formatString(messages.initializeUserMoney, initialMoney);
                }
                const currentUserStocks = await database.get("userstock", { id: [Number(user.id)] }, stocks.map((i) => i[0] as string));
                if (currentUserStocks.length > 0) {
                    const userStock = currentUserStocks[0];
                    stocks.forEach((item) => {
                        const curStock = userStock[item[0]];
                        if (curStock < item[1]) {
                            msg += formatString(messages.notEnoughMoney, item[1] + stockBaseInfos[item[0]].unit + item[0], curStock);
                            return msg;
                        }
                        item[1] = curStock - item[1];
                    });
                } else {
                    msg += messages.emptyWarehouse;
                    return msg;
                }
                user.money += cost;
                const query: Partial<UserStockTable> = { id: Number(user.id) };
                stocks.forEach((stock) => {
                    query[stock[0]] = stock[1];
                })
                await database.update("userstock", [query]);
                return formatString(messages.selloutStock, stocks.map((i) => `${i[0]}*${i[1]}`).join(", "), `${equations.join("+")}=${cost}`);
            } catch (e) {
                if (e.message) {
                    return e.message;
                }
                console.error(e);
            }
        });

    rootCommand.subcommand("warehouse", messages.warehouseDescription)
        .alias("仓库")
        .userFields(["id", "money"])
        .action(async ({ session }) => {
            try {
                let msg = "";
                const user = session?.user!;
                const myStocks = await database.get("userstock", { id: [Number(user.id)] }, Object.keys(stockBaseInfos));

                
            } catch (e) {
                if (e.message) {
                    return e.message;
                }
                console.error(e);
            }
        });

}

export const name = "Market";