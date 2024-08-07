export type StockBaseInfo = {
    id: string,
    name: string,
    unit: string,
    initialPrice: number,
    minPrice: number,
    maxPrice?: number,
    range: number | [number, number] // [down rage, up range]
}

export const stockName2IdMap: Record<string, string> = {}

export function createStockBaseInfo(id: string, info?: string | Partial<StockBaseInfo>): StockBaseInfo {
    if (info === null) {
        info = id;
    }
    if (typeof info === "string") {
        info = { name: info };
    }
    const result = {
        id,
        name: id,
        unit: "kg",
        initialPrice: 100,
        minPrice: 13,
        maxPrice: 100000,
        range: 0.2,
        ...info
    };
    stockName2IdMap[result.name] = id;
    return result;
}

export const defaultStocks: Record<string, Partial<StockBaseInfo>> = {
    carrot: {
        name: "胡萝卜",
        unit: "斤",
        initialPrice: 200,
        range: 0.1
    },
    cabbage: {
        name: "白菜",
        unit: "斤",
        initialPrice: 100,
        range: 0.05
    },
    pork: {
        name: "猪肉",
        unit: "斤",
        initialPrice: 500,
        range: 0.15
    },
    watermelon: {
        name: "西瓜",
        unit: "个",
        initialPrice: 400,
        range: 0.18
    },
}