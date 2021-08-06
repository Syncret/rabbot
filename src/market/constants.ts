export enum Stock {
    carrot = "carrot",
    cabbage = "cabbage",
    pork = "pork"
}

export type StockBaseInfo = {
    name: string,
    initialPrice: number,
    minPrice: number,
    maxPrice?: number,
    range: number
}

export const stockBaseInfos: Record<Stock, StockBaseInfo> = {
    carrot: {
        name: "红萝卜",
        initialPrice: 200,
        minPrice: 1,
        maxPrice: 100000,
        range: 20
    },
    cabbage: {
        name: "大白菜",
        initialPrice: 100,
        minPrice: 1,
        maxPrice: 100000,
        range: 10
    },
    pork: {
        name: "猪肉",
        initialPrice: 500,
        minPrice: 1,
        maxPrice: 100000,
        range: 30
    },
}