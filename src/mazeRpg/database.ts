import { User, Database } from "koishi";
import { } from 'koishi-plugin-mysql'
import { Phase } from "./phase";
import { Player } from "./player";

declare module 'koishi-core' {
    interface User {
        appearance: Player.Appearance,
        rpgstatus?: Player.Status,
        money: number,
        rpgphase: Phase,
        rpgitems: Record<string, number>
    }
}

User.extend(() => ({
    appearance: undefined,
    rpgstatus: undefined,
    money: 0,
    rpgphase: Phase.end,
    rpgitems: {},

}));
export const rpgFields = ["appearance", "money", "rpgitems", "rpgstatus", "rpgphase"] as const;

Database.extend('koishi-plugin-mysql', ({ Domain, tables }) => {
    if (tables.user) {
        tables.user.appearance = new Domain.Json();
        tables.user.money = "int";
        tables.user.rpgphase = "int";
        tables.user.rpgitems = new Domain.Json();
        tables.user.rpgstatus = new Domain.Json();
    }
})