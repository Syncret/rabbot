import { User, Database, Tables } from "koishi";
import { } from 'koishi-plugin-mysql'
import { StockBaseInfo } from "./stock";

declare module 'koishi-core' {
    interface User {
        money: number,
    }
    interface Tables {
        stockinfo: StockInfoTable,
        userstock: UserStockTable
    }
    interface Database {
        getStockInfo(): Promise<Array<Tables["stockinfo"]>>,
        getStockInfo(stock: string): Promise<Tables["stockinfo"]>,
        patchStockInfo(stocks: Record<string, StockBaseInfo>): Promise<unknown>,
    }
};
export type StockInfoTable = {
    id: string,
    price: number,
    lastprice: number,
};
export type UserStockTable = {
    id: number,
    record: Record<string, number>
} & Record<string, number>;

User.extend(() => ({
    money: 0,
}));

Tables.extend('stockinfo');
Tables.extend('userstock');

Database.extend("koishi-plugin-mysql", {
    async getStockInfo(name?: string) {
        if (name) {
            const result = await this.get("stockinfo", [name]);
            return result[0];
        }
        return await this.query("select * from stockinfo;");
    },
    /**
     * Initialize database or patch new stockinfo to database
     */
    async patchStockInfo(stocks: Record<string, StockBaseInfo>) {
        const sources = Object.entries((stocks)).map(([stock, info]) => {
            return `INSERT IGNORE INTO stockinfo
            (id, price, lastprice)
        VALUES
            (${this.escape(stock)}, ${info.initialPrice}, ${info.initialPrice});`
        });
        return await this.query(sources);
    },
});

Database.extend('koishi-plugin-mysql', ({ Domain, tables }) => {
    if (tables.user) {
        tables.user.money = "int";
    }
    tables.stockinfo = {
        id: `VARCHAR(50) NOT NULL`,
        price: `INT`,
        lastprice: `INT`,
    };
});

export function initializeStockBaseInfoTable(stocks: Record<string, StockBaseInfo>) {
    Database.extend('koishi-plugin-mysql', ({ Domain, tables }) => {
        const stockColumns: Record<string, string> = {};
        Object.keys(stocks).forEach((stock) => {
            stockColumns[stock] = `INT(10) UNSIGNED DEFAULT 0`;
        });
        tables.userstock = {
            id: `INT(10) UNSIGNED NOT NULL`,
            record: new Domain.Json(),
            ...stockColumns
        };
    });
}