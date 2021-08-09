export function formatString(msg: string, ...values: Array<string | number>): string {
    values.forEach((v, index) => {
        msg = msg.replaceAll(`{${index}}`, v + "");
    });
    return msg;
}

export const messages = {
    notEnoughMoney: "需要{0}元(现在{1})。没有足够的钱呢。",
    buyinStock: "花费{0}元，买入{1}。",
    selloutStock: "卖出{0}元，获得{1}。",
    marketCommandDescription: "一个市场模拟游戏。",
    buyinDescription: "买入 {商品1}*{数量},{商品2}*{数量}...",
    selloutDescription: "卖出 {商品1}*{数量},{商品2}*{数量}...",
    warehouseDescription: "查看仓库",
    marketInfoDescription: "查看今日行情",
    initializeUserMoney: "初始资金{0}元。",
    emptyWarehouse: "你的仓库是空的呢。",
    stockNotEnough: "你并没有{0}（现在{1}）呢。",
    itemNotFound: "找不到{0}。",
}