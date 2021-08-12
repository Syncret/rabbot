import { Context, Logger, Random } from "koishi";
import { createStockBaseInfo, defaultStocks, StockBaseInfo, stockName2IdMap } from "./stock";
import { initializeStockBaseInfoTable, UserStockTable } from "./database";
import { formatString, messages } from "./messages";
import { limitNumberValue, string2ItemWithCountArray } from "./util";
import * as schedule from "node-schedule";

export const name = "Market";
export interface Config {
    initialMoney?: number,
    stocks?: Record<string, string | Partial<StockBaseInfo>>,
    openTime?: number,
    closeTime?: number,
    timezoneOffset?: number,
}

const logger = new Logger(name);

export const stockBaseInfos: Record<string, StockBaseInfo> = {};

function filterValidStockNames<T>(items: Array<T>, getName: (item: T) => string) {
    const validItems: T[] = [];
    const invalidItems: T[] = [];
    let invalidItemsMsg = "";
    for (const item of items) {
        const name = getName(item);
        if (stockName2IdMap[name]) {
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
    const { initialMoney = 1000, stocks = defaultStocks, openTime = 8, closeTime = 23, timezoneOffset = 8 } = config || {};
    const database = ctx.database;

    // initialize Stock base info
    Object.entries(stocks).forEach(([id, info]) => {
        stockBaseInfos[id] = createStockBaseInfo(id, info);
    });

    // initialize database
    initializeStockBaseInfoTable(stockBaseInfos);

    // initialize utility functions
    const utcHour2LocalTimeZone = (utcHour: number) => (utcHour + 24 + timezoneOffset) % 24;
    const checkMarketOpenTime = () => {
        const now = new Date();
        const curHour = utcHour2LocalTimeZone(now.getUTCHours());
        if (curHour < openTime || curHour > closeTime) {
            return messages.marketNotOpen;
        }
        return undefined;
    }
    const updateMarket = async () => {
        const infos = await database.getStockInfo();
        const newStocks = infos.map((info) => {
            const baseInfo = stockBaseInfos[info.id];
            if (baseInfo) {
                const variation = Math.random() * baseInfo.range * 2 - baseInfo.range;
                let newPrice = Math.round(info.price * (1 + variation));
                newPrice = limitNumberValue(newPrice, baseInfo.minPrice, baseInfo.maxPrice);
                return {
                    id: info.id,
                    lastprice: info.price,
                    price: newPrice
                };
            }
            return undefined!;
        }).filter((m) => !!m);
        return await database.update("stockinfo", newStocks);
    }
    const rule = new schedule.RecurrenceRule();
    rule.hour = (openTime + 24 - timezoneOffset) % 24;
    rule.minute = 0;

    schedule.scheduleJob(rule, async () => {
        try {
            await updateMarket();
            logger.info("Market daily updated");
        } catch (e) {
            logger.error(e);
        }
    });

    // register commands
    const rootCommand = ctx.command("market", messages.marketCommandDescription)
        .alias(messages.market)
        .userFields(["id", "money"])
        .action(async ({ session, options }) => {
            const infos = await database.getStockInfo();
            const msgs = infos.map((info) => {
                const baseInfo = stockBaseInfos[info.id];
                let msg = "";
                if (baseInfo) {
                    let additionalMsg = "";
                    if (info.lastprice) {
                        const diff = info.price / info.lastprice - 1;
                        additionalMsg += `, ${diff >= 0 ? diff === 0 ? "=" : "↑" : "↓"}${Number((diff * 100).toFixed(1))}%`;
                    }
                    msg = `${baseInfo.name}${info.price}${messages.moneyUnit}/${baseInfo.unit}${additionalMsg};`
                }
                return msg;
            }).filter((m) => !!m);
            const msg = msgs.join(" ") || messages.noStockInMarket;
            return messages.dailyMarket + msg;
        });;
    rootCommand.subcommand("marketpatchdatabase", "update database", { hidden: true })
        .action(async ({ }) => {
            await database.patchStockInfo(stockBaseInfos);
            return `complete`;
        });
    rootCommand.subcommand("dailyupdate", "explicitly update stock prices", { hidden: true })
        .action(async ({ }) => {
            const response = await updateMarket();
            return JSON.stringify(response) || "complete";
        });

    rootCommand.subcommand("buyin <items:text>", messages.buyinDescription)
        .alias(messages.buyin)
        .check(() => checkMarketOpenTime())
        .userFields(["id", "money"])
        .action(async ({ session, options }, text) => {
            try {
                let msg = "";
                const items = string2ItemWithCountArray(text);
                const validation = filterValidStockNames(items, (item) => item[0]);
                msg += validation.invalidItemsMsg;
                const validStocks = validation.valid.map((v) => ({ id: stockName2IdMap[v[0]], count: v[1], name: v[0] }));
                if (validStocks.length === 0) {
                    return msg || messages.requireInputStocks;
                }
                const prices = await database.get("stockinfo", validStocks.map((i) => i.id), ["id", "price"]);
                let cost = 0;
                const equations = prices.map((p, index) => {
                    const stock = validStocks.find((s) => s.id === p.id);
                    if (stock == null) {
                        throw Error(formatString(messages.stockNotFoundInDatabase, p.id));
                    }
                    const count = stock!.count;
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
                const currentUserStocks = await database.get("userstock", { id: [Number(user.id)] }, validStocks.map((i) => i.id));
                if (currentUserStocks.length > 0) {
                    const userStock = currentUserStocks[0];
                    validStocks.forEach((i) => i.count += userStock[i.id]);
                }
                user.money -= cost;
                const query: Partial<UserStockTable> = { id: Number(user.id) };
                validStocks.forEach((stock) => {
                    query[stock.id] = stock.count;
                })
                await database.update("userstock", [query]);
                return formatString(messages.buyinStock, `${equations.join("+")}=${cost}`, validStocks.map((i) => `${i.name}*${i.count}${stockBaseInfos[i.id].unit}`).join(", "));
            } catch (e) {
                if (e.message) {
                    return e.message;
                }
                console.error(e);
            }
        });

    rootCommand.subcommand("sellout <items:text>", messages.selloutDescription)
        .alias(messages.sellout)
        .check(() => checkMarketOpenTime())
        .userFields(["id", "money"])
        .action(async ({ session, options }, text) => {
            try {
                let msg = "";
                const items = string2ItemWithCountArray(text);
                const validation = filterValidStockNames(items, (item) => item[0]);
                msg += validation.invalidItemsMsg;
                const validStocks = validation.valid.map((v) => ({ id: stockName2IdMap[v[0]], count: v[1], name: v[0] }));
                if (validStocks.length === 0) {
                    return msg || messages.requireInputStocks;
                }
                const prices = await database.get("stockinfo", validStocks.map((i) => i.id), ["id", "price"]);
                let cost = 0;
                const equations = prices.map((p) => {
                    const stock = validStocks.find((s) => s.id === p.id);
                    if (stock == null) {
                        throw Error(formatString(messages.stockNotFoundInDatabase, p.id));
                    }
                    const count = stock!.count;
                    cost += p.price * count;
                    return `${p.price}*${count}`;
                });
                const user = session?.user!;
                if (user.money == null) {
                    user.money = initialMoney;
                    msg += formatString(messages.initializeUserMoney, initialMoney);
                }
                const currentUserStocks = await database.get("userstock", { id: [Number(user.id)] }, validStocks.map((i) => i.id));
                if (currentUserStocks.length === 0) {
                    msg += messages.emptyWarehouse;
                    return msg;
                }
                const userStock = currentUserStocks[0];
                for (const item of validStocks) {
                    const curStock = userStock[item.id];
                    if (curStock < item.count) {
                        msg += formatString(messages.stockNotEnough, item.count + stockBaseInfos[item.id].unit + item.name, curStock);
                        return msg;
                    } else {
                        item.count = curStock - item.count;
                    }
                }
                const tax = Math.ceil(cost * 0.01);
                user.money += cost - tax;
                const query: Partial<UserStockTable> = { id: Number(user.id) };
                validStocks.forEach((stock) => {
                    query[stock.id] = stock.count;
                })
                await database.update("userstock", [query]);
                return formatString(messages.selloutStock, validStocks.map((i) => `${i.name}*${userStock[i.id] - i.count}${stockBaseInfos[i.id].unit}`).join(", "),
                    `${equations.join("+")}=${cost}`, tax);
            } catch (e) {
                if (e.message) {
                    return e.message;
                }
                console.error(e);
            }
        });

    rootCommand.subcommand("warehouse", messages.warehouseDescription)
        .alias(messages.warehouse)
        .userFields(["id", "money"])
        .action(async ({ session }) => {
            try {
                const user = session?.user!;
                const myStocks = await database.get("userstock", { id: [Number(user.id)] }, Object.keys(stockBaseInfos));
                if (myStocks.length === 0) {
                    return formatString(messages.currentMoney, user.money);
                }
                const myStock = myStocks[0];
                const stocksMsg = Object.entries(myStock).slice(0, 10).map(([key, value]) => {
                    const baseInfo = stockBaseInfos[key];
                    if (baseInfo && value !== 0) {
                        return `${baseInfo.name}*${value}${baseInfo.unit}`;
                    }
                    return undefined;
                }).filter((i) => i).join(", ");
                return formatString(messages.userCurrentWarehouse, user.money, stocksMsg);
            } catch (e) {
                if (e.message) {
                    return e.message;
                }
                console.error(e);
            }
        });
    rootCommand.subcommand("money", messages.moneyDescription)
        .alias(messages.money)
        .userFields(["money"])
        .action(async ({ session }) => {
            return formatString(messages.currentMoney, session?.user?.money!);
        });
}
