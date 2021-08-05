export enum Stock {
    carrot = "carrot",
    cabbage = "cabbage",
    pork = "pork"
}

export type StockBaseInfo = {
    initialPrice: number,
    minPrice: number,
    maxPrice?: number,
    range: number
}

export const stockBaseInfos: Record<Stock, StockBaseInfo> = {
    carrot: {
        initialPrice: 200,
        minPrice: 1,
        maxPrice: 100000,
        range: 20
    },
    cabbage: {
        initialPrice: 100,
        minPrice: 1,
        maxPrice: 100000,
        range: 10
    },
    pork: {
        initialPrice: 500,
        minPrice: 1,
        maxPrice: 100000,
        range: 30
    },
}