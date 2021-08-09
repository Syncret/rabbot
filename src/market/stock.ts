export type StockBaseInfo = {
    name: string,
    unit: string,
    initialPrice: number,
    minPrice: number,
    maxPrice?: number,
    range: number
}

export function createStockBaseInfo(id: string, info?: string | Partial<StockBaseInfo>): StockBaseInfo {
    if (info === null) {
        info = id;
    }
    if (typeof info === "string") {
        info = { name: info };
    }
    return {
        name: id,
        unit: "kg",
        initialPrice: 100,
        minPrice: 1,
        maxPrice: 100000,
        range: 20,
        ...info
    };
}

export const defaultStocks: Record<string, Partial<StockBaseInfo>> = {
    carrot: {
        name: "红萝卜",
        initialPrice: 200,
        range: 20
    },
    cabbage: {
        name: "大白菜",
        initialPrice: 100,
        range: 10
    },
    pork: {
        name: "猪肉",
        initialPrice: 500,
        range: 30
    },
}