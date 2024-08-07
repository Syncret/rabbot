export function formatString(msg: string, ...values: Array<string | number>): string {
    values.forEach((v, index) => {
        const reg = new RegExp(`\\{${index}\\}`, "g")
        msg = msg.replace(reg, v + "");
    });
    return msg;
}

export const messages = {
    warehouse: "仓库",
    buyin: "买入",
    sellout: "卖出",
    market: "市场",
    money: "现金",
    dailyMarket: "今日行情：",
    notEnoughMoney: "需要{0}元(现在{1})。没有足够的钱呢。",
    buyinStock: "你花费{0}元，买入{1}。",
    selloutStock: "你卖出{0}，获得{1}元，并缴纳了{2}元交易费用。",
    marketCommandDescription: "一个市场模拟游戏。",
    buyinDescription: "买入 {商品1}*{数量} 或是 {金钱}/{商品1},{商品2}*{数量} ...",
    selloutDescription: "卖出 {商品1}*{数量} 或是 {金钱}/{商品1},{商品2}*{数量}...",
    warehouseDescription: "查看仓库",
    moneyDescription: "查看持有现金",
    currentMoney: "你有{0}元现金。",
    marketInfoDescription: "查看今日行情",
    initializeUserMoney: "初始资金{0}元。",
    emptyWarehouse: "你的仓库是空的呢。",
    stockNotEnough: "你并没有{0}（现在{1}）呢。",
    itemNotFound: "找不到{0}。",
    userCurrentWarehouse: "你有{0}元，{1}。",
    marketNotOpen: "还没开门呢。开门时间每日{0}点到{1}点。",
    moneyUnit: "元",
    noStockInMarket: "目前没有商品呢。",
    requireInputStocks: "需要输入商品名呢。",
    stockNotFoundInDatabase: "数据库中找不到{0}商品，请联系管理员更新数据库。"
}