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
        rpgname: string,
        mazeId: number,
        mazeCellId: number
    }
    interface Tables {
        maze: Maze,
        mazeCell: MazeCell
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
    rpgphase: Phase.end,
    rpgitems: {},
    rpgstate: 0,
    mazeCellId: 0,
}));
export const rpgFields = ["appearance", "money", "rpgitems", "rpgstatus", "rpgphase", "rpgstate", "mazeCellId"] as const;

Tables.extend('maze');

Database.extend('koishi-plugin-mysql', ({ Domain, tables }) => {
    if (tables.user) {
        tables.user.appearance = new Domain.Json();
        tables.user.money = "int";
        tables.user.rpgphase = "int";
        tables.user.rpgitems = new Domain.Json();
        tables.user.rpgstatus = new Domain.Json();
        tables.user.rpgstate = "int";
        tables.user.rpgname = "varchar(20)";
        tables.user.mazeCellId = "int";
    }
});

Database.extend('koishi-plugin-mysql', ({ Domain, tables }) => {
    tables.maze = {
        id: `INT(10) UNSIGNED PRIMARY KEY AUTO_INCREMENT`,
        name: `VARCHAR(50) NOT NULL`,
        channelId: `VARCHAR(50) NOT NULL`,
        width: `SMALLINT`,
        height: `SMALLINT`,
        level: `TINYINT UNSIGNED`,
    }
});

Database.extend('koishi-plugin-mysql', ({ Domain, tables }) => {
    tables.mazeCell = {
        id: `INT(10) UNSIGNED PRIMARY KEY AUTO_INCREMENT`,
        mazeId: `INT(10) NOT NULL`,
        cell: `SMALLINT UNSIGNED`,
        door: `SMALLINT UNSIGNED`,
        items: new Domain.Json(),
        room: `VARCHAR(20)`
    }
});