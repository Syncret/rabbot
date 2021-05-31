import { User, Database, Tables } from "koishi";
import { } from 'koishi-plugin-mysql'

declare module 'koishi-core' {
    interface User {
        appearance: Appearance,
        rpgstatus: Status,
        money: number,
        rpgitems: Record<string, number>;
        rpgstate: number,
        rpgname: string,
        rpgap: number,
        mazeId: number,
        mazecellid: number,
        rpgrecords: PlayRecords;
    }
    interface Tables {
        maze: Maze,
        mazecell: MazeCell
    }
    interface Database {
        getCellById<F extends Tables.Field<"mazecell">>(id: number, fields?: F[]): Promise<Pick<Tables["mazecell"], F>>,
        getMazeById<F extends Tables.Field<"maze">>(id: number, fields?: F[]): Promise<Pick<Tables["maze"], F>>,
        getMazeByCellId<F extends Tables.Field<"maze">>(id: number, fields?: F[]): Promise<Pick<Tables["maze"], F>>
    }
};
export interface Maze {
    id: number,
    name: string,
    channelId: string,
    level: number,
    width: number,
    height: number,
    state: number,
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
export const rpgFields = ["appearance", "money", "rpgname", "rpgitems", "rpgstatus", "rpgstate", "mazecellid", "rpgrecords", "timers"] as const;

Tables.extend('maze');
Tables.extend('mazecell');


Database.extend("koishi-plugin-mysql", {
    async getCellById(id, fields) {
        return (await this.get("mazecell", [id], fields))[0];
    },
    async getMazeById(id, fields) {
        return (await this.get("maze", [id], fields))[0];
    },
    async getMazeByCellId(id, fields) {
        const cell = await this.getCellById(id, ["mazeId"]);
        return this.getMazeById(cell.mazeId, fields);
    },
})

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
        tables.user.rpgrecords = new Domain.Json();
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
        state: `TINYINT UNSIGNED`,
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

export type Appearance = {
    hairColor: string,
    hairType: string,
    eyeColor: string,
    height: number,
};

export type Status = {
    level: number,
    exp: number,
    hp: number,
    mp: number,
    status: number,
    weapon?: string,
    armor?: string,
    accessory?: string,
    rpgdice?: number,
}
export type PlayRecords = {
    visited: number[];
    logs: string[];
}