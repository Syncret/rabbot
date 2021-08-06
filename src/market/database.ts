import { User, Database, Tables } from "koishi";
import { } from 'koishi-plugin-mysql'
import { Stock } from "./constants";

declare module 'koishi-core' {
    interface User {
        money: number,
    }
    interface Tables {
        stockinfo: StockInfoTable,
        userstock: UserStockTable
    }
    interface Database {
        getAllStockInfo(): Promise<Array<Tables["stockinfo"]>>,
    }
};
export type StockInfoTable = {
    id: number,
    name: string,
    price: number,
    lastprice: number,
};
export type UserStockTable = {
    id: number,
    record: Record<string, number>
} & Record<Stock, number>;

User.extend(() => ({
    money: 0,
}));

Tables.extend('stockinfo');
Tables.extend('userstock');

Database.extend("koishi-plugin-mysql", {
    async getAllStockInfo() {
        return await this.query("select top 10 from stockinfo;");
    },
});

Database.extend('koishi-plugin-mysql', ({ Domain, tables }) => {
    if (tables.user) {
        tables.user.money = "int";
    }
    tables.stockinfo = {
        id: `INT(10) UNSIGNED NOT NULL AUTO_INCREMENT`,
        name: `VARCHAR(50)`,
        price: `INT`,
        lastprice: `INT`,
    };

    const stockColumns: Record<string, string> = {};
    Object.keys((Stock)).forEach((stock) => {
        stockColumns[stock] = `INT(10) UNSIGNED DEFAULT 0`
    });
    tables.userstock = {
        id: `INT(10) UNSIGNED NOT NULL`,
        record: new Domain.Json(),
        ...stockColumns
    };
});