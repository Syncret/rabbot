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
};
export type StockInfoTable = {
    id: number,
    name: string,
    price: number,
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


Database.extend('koishi-plugin-mysql', ({ Domain, tables }) => {
    if (tables.user) {
        tables.user.money = "int";
    }
    tables.stockinfo = {
        id: `INT(10) UNSIGNED NOT NULL AUTO_INCREMENT`,
        name: `VARCHAR(50)`,
        price: `INT`,
    };
    tables.userstock={

    }
});