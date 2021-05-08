import { User, Database, Tables } from "koishi";
import { } from 'koishi-plugin-mysql'
import { Player } from "./player";

declare module 'koishi-core' {
    interface User {
        appearance: Player.Appearance,
        rpgstatus: Player.Status,
        money: number,
        rpgitems: Record<string, number>;
        rpgstate: number,
        rpgname: string,
        rpgap: number,
        mazeId: number,
        mazecellid: number
    }
    interface Tables {
        maze: Maze,
        mazecell: MazeCell
    }
};
export interface Maze {
    id: number,
    name: string,
    channelId: string,
    level: number,
    width: number,
    height: number,
};
export interface MazeCell {
    id: number,
    mazeId: number,
    cell: number,
    door: number,
    items: Record<string, number>,
    room: string,
};

User.extend(() => ({
    appearance: undefined,
    rpgstatus: undefined,
    money: 0,
    rpgitems: {},
    rpgstate: 0,
    rpgap: 0,
    mazecellid: 0,
}));
export const rpgFields = ["appearance", "money", "rpgname", "rpgitems", "rpgstatus", "rpgstate", "mazecellid"] as const;

Tables.extend('maze');
Tables.extend('mazecell');

Database.extend('koishi-plugin-mysql', ({ Domain, tables }) => {
    if (tables.user) {
        tables.user.appearance = new Domain.Json();
        tables.user.money = "int";
        tables.user.rpgitems = new Domain.Json();
        tables.user.rpgstatus = new Domain.Json();
        tables.user.rpgap = "tinyint";
        tables.user.rpgstate = "int";
        tables.user.rpgname = "varchar(20)";
        tables.user.mazecellid = "int";
    }
});

Database.extend('koishi-plugin-mysql', ({ Domain, tables }) => {
    tables.maze = {
        id: `INT(10) UNSIGNED NOT NULL AUTO_INCREMENT`,
        name: `VARCHAR(50) NOT NULL`,
        channelId: `VARCHAR(50) NOT NULL`,
        width: `SMALLINT`,
        height: `SMALLINT`,
        level: `TINYINT UNSIGNED`,
    }
});

Database.extend('koishi-plugin-mysql', ({ Domain, tables }) => {
    tables.mazecell = {
        id: `INT(10) UNSIGNED NOT NULL AUTO_INCREMENT`,
        mazeId: `INT(10) NOT NULL`,
        cell: `SMALLINT UNSIGNED`,
        door: `SMALLINT UNSIGNED`,
        items: new Domain.Json(),
        room: `VARCHAR(20)`
    }
});