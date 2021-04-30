import { User, Database, Tables } from "koishi";
import { } from 'koishi-plugin-mysql'
import { Phase } from "./state";
import { Player } from "./player";

declare module 'koishi-core' {
    interface User {
        appearance: Player.Appearance,
        rpgstatus: Player.Status,
        money: number,
        rpgphase: Phase,
        rpgitems: Record<string, number>;
        rpgstate: number,
        mazeId: number,
        mazeCellId: number
    }
    interface Tables {
        maze: Maze
    }
};
export interface Maze {
    id: number,
    channelId:string,
    level:number,
    cell:number,
    doors: number,
    type:number,
};

User.extend(() => ({
    appearance: undefined,
    rpgstatus: undefined,
    money: 0,
    rpgphase: Phase.end,
    rpgitems: {},
    rpgstate: 0,
    mazeCellId: 0,
}));
export const rpgFields = ["appearance", "money", "rpgitems", "rpgstatus", "rpgphase", "rpgstate"] as const;

Tables.extend('maze');

Database.extend('koishi-plugin-mysql', ({ Domain, tables }) => {
    if (tables.user) {
        tables.user.appearance = new Domain.Json();
        tables.user.money = "int";
        tables.user.rpgphase = "int";
        tables.user.rpgitems = new Domain.Json();
        tables.user.rpgstatus = new Domain.Json();
        tables.user.rpgstate = "int";
        tables.user.mazeCellId = "int";
    }
})

Database.extend('koishi-plugin-mysql', ({ Domain, tables }) => {
    tables.maze = {
        id: `INT(10) UNSIGNED NOT NULL AUTO_INCREMENT`,
        channelId: `VARCHAR(50) NOT NULL`,
        level: `TINYINT UNSIGNED`,
        cell: `SMALLINT UNSIGNED`,
        doors: `SMALLINT UNSIGNED`,
        type: `INT`
    }
})
