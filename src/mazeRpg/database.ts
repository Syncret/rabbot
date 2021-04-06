import { User, Database } from "koishi";
import { } from 'koishi-plugin-mysql'
import { Phase } from "./state";
import { Player } from "./player";

declare module 'koishi-core' {
    interface User {
        appearance: Player.Appearance,
        rpgstatus?: Player.Status,
        money: number,
        rpgphase: Phase,
        rpgitems: Record<string, number>;
        rpgstate: number,
    }
}

User.extend(() => ({
    appearance: undefined,
    rpgstatus: undefined,
    money: 0,
    rpgphase: Phase.end,
    rpgitems: {},
    rpgstate: 0,

}));
export const rpgFields = ["appearance", "money", "rpgitems", "rpgstatus", "rpgphase", "rpgstate"] as const;

Database.extend('koishi-plugin-mysql', ({ Domain, tables }) => {
    if (tables.user) {
        tables.user.appearance = new Domain.Json();
        tables.user.money = "int";
        tables.user.rpgphase = "int";
        tables.user.rpgitems = new Domain.Json();
        tables.user.rpgstatus = new Domain.Json();
        tables.user.rpgstate = "int";
    }
})