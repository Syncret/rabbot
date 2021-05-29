import { Database, Random, Time, User } from "koishi";
import { Maze } from "./database";
import { State } from "./state";
import { createMutualMap, implementType, max } from "./util";
import { parseCellDoorCode } from "./maze.util";

export namespace Room {

    type RoomType = "normal" | "trap" | "rest" | "shop" | "stair";
    export const RoomDirectionMap: Map<string, string> = createMutualMap([
        ["up", "北"],
        ["right", "东"],
        ["down", "南"],
        ["left", "西"]
    ]);

    type UserInCell = User.Observed<"rpgrecords" | "mazecellid" | "id" | "rpgstatus" | "rpgap" | "rpgstate" | "timers">;
    type BaseRoom = {
        name: string,
        type: RoomType,
        displayName: string,
        probabilty: number,
        description: string,
        effect?: number,
        items: Record<string, number>
    }
    type TrapRoom = BaseRoom & {
        type: "trap",
        effect: number;
        onEnter: (
            user: UserInCell,
            level: Pick<Maze, "level" | "width" | "height" | "id">,
            database: Database) =>
            Promise<{ msg: string, interupt: boolean }>;
    };

    export const RoomRemainingItemsKey = "__ITEMGEN__"; // key for room remaining random items
    export const RoomRegistry: Record<string, BaseRoom> = {};
    export const RoomProbMap: Record<string, number> = {};
    export function getDoorDescription(doorCode: number): string {
        const door = parseCellDoorCode(doorCode);
        const gates = Object.entries(door).filter(([_, isOpen]) => isOpen).map(([direction]) => Room.RoomDirectionMap.get(direction));
        return `房间的${gates.join(", ")}边${gates.length > 1 ? "各" : ""}有一扇门。`;
    }
    export function isTrapRoom(room: BaseRoom): room is TrapRoom {
        return room.type === "trap";
    }

    function registerRoom(room: BaseRoom) {
        if (RoomRegistry[room.name]) {
            throw Error("Duplicate room key: " + room.name);
        }
        RoomRegistry[room.name] = room;
        if (room.probabilty > 0) {
            RoomProbMap[room.name] = room.probabilty;
        }
        return room;
    }

    export const blankRoom: BaseRoom = {
        name: "blank",
        type: "normal",
        displayName: "空房间",
        probabilty: 10,
        description: "房间里空旷又安静，似乎没有什么特别的东西。",
        items: { [RoomRemainingItemsKey]: 10 }

    };
    export const springRoom: BaseRoom = {
        name: "spring",
        type: "rest",
        displayName: "泉水房间",
        probabilty: 5,
        effect: 10,
        description: "房间里氤氲着热腾腾的雾气。中间有一个水池，是一个温泉！似乎可以在这里休息的样子。",
        items: { [RoomRemainingItemsKey]: 10 }
    };
    export const fallTrapRoom: TrapRoom = {
        name: "fallTrap",
        type: "trap",
        displayName: "落穴陷阱",
        probabilty: 20,
        effect: 20,
        description: "房间中间有一个掩盖起来的陷阱。",
        items: { [RoomRemainingItemsKey]: 10 },
        onEnter: async (user, maze) => {
            let msg = "";
            let interupt = false;
            const prob = 1 + (maze.level - user.rpgstatus.level) / 10;
            const escape = Math.random() > prob;
            msg += `你触发了落穴陷阱！`;
            if (escape) {
                msg += `但是你成功地躲了过去！`;
            } else {
                const damage = Math.floor(fallTrapRoom.effect * (Math.random() + 0.5));
                user.rpgstatus.hp -= damage;
                msg += `你受到了${damage}点伤害！剩余hp ${user.rpgstatus.hp}。`;
                if (user.rpgstatus.hp <= 0) {
                    const penalty = Math.floor(Time.day / State.apRecoverInterval);
                    msg += `你死掉了呢...体力已扣为-${penalty}点，可等体力恢复正值后行动。`;
                    user.rpgap = -penalty;
                    user.rpgstatus.hp = 1;
                    interupt = true;
                }
            }
            return { msg, interupt };
        }
    };
    export const sleepTrapRoom: TrapRoom = {
        name: "sleepTrap",
        type: "trap",
        displayName: "催眠陷阱",
        probabilty: 20,
        effect: 7,
        description: "房间里似乎有一个会触发催眠陷阱的机关。",
        items: { [RoomRemainingItemsKey]: 10 },
        onEnter: async (user, maze) => {
            let msg = "";
            let interupt = false;
            const prob = 1 + (maze.level - user.rpgstatus.level) / 10;
            const escape = Math.random() > prob;
            if (escape) {
                msg += `你发现了房间中的有一个陷阱机关，你小心地躲开了它。`;
            } else {
                msg += `你触发了催眠陷阱！房间里突然喷出催眠气体，你勉强支撑了一阵后最终沉沉地昏睡了过去。`;
                let effect = sleepTrapRoom.effect + max(0, maze.level - user.rpgstatus.level);
                State.setDebuffTime(user, Date.now() + effect * Time.hour);
                user.rpgstate |= State.sleep;
                msg += `看来要${effect}小时后才能醒来。`;
                interupt = true;
            }
            return { msg, interupt };
        }
    };
    export const tentacleTrapRoom = implementType<TrapRoom>()({
        name: "tentacleTrap",
        type: "trap",
        displayName: "触手陷阱",
        probabilty: 20,
        effect: 2,
        description: "房间里有好多触手。",
        items: { [RoomRemainingItemsKey]: 5, "触手": 3, "触手服": 3 },
        onEnter: async (user, maze) => {
            let msg = "";
            let interupt = false;
            const equipTentacle = user.rpgstatus.weapon === "触手" || user.rpgstatus.armor === "触手服";
            const prob = 0.5 + (maze.level - user.rpgstatus.level) / 10;
            const escape = equipTentacle ? false : Math.random() > prob;
            if (escape) {
                msg += `你发现了房间中的好多触手，你小心地躲开了它们。`;
            } else {
                msg += equipTentacle ? `房间中有许多触手，你一进房间，身上的触手就和它们纠缠在了一起，你一时动弹不得。` : `房间中有许多触手，你一不小心，被触手紧紧地束缚住了！`;
                msg += await tentacleTrapRoom.onTrap(user, maze.level);
                interupt = true;
            }
            return { msg, interupt };
        },
        onTrap: async (user: User.Observed<"rpgstatus" | "rpgstate">, level: number) => {
            let effect = tentacleTrapRoom.effect + max(0, level - user.rpgstatus.level);
            const equipTentacle = user.rpgstatus.weapon === "触手" || user.rpgstatus.armor === "触手服";
            effect = equipTentacle ? effect * 2 : effect;
            user.rpgstatus.rpgdice = effect;
            user.rpgstate |= State.tentacle;
            return `可以使用挣脱(escape)指令掷骰${effect}点挣脱。`;
        }
    });
    export const amnesiaTrapRoom: TrapRoom = {
        name: "amnesiaTrap",
        type: "trap",
        displayName: "传送陷阱",
        probabilty: 5,
        effect: 0,
        description: "房间里有一个会传送机关陷阱。",
        items: { [RoomRemainingItemsKey]: 10 },
        onEnter: async (user, maze, database) => {
            let msg = "";
            let interupt = false;
            const prob = 1 + (maze.level - user.rpgstatus.level) / 10;
            const escape = Math.random() > prob;
            if (escape) {
                msg += `你发现了房间中的传送陷阱，你小心地躲开了它。`;
            } else {
                msg += `你触发了传送陷阱！地上突然出现一个传送法阵，一阵强光之后，你被传送到了另一个房间。`;
                const targetCell = Random.int(maze.width * maze.height);
                interupt = true;
                msg += await onEnterCell(database, maze.id, targetCell, user)
            }
            return { msg, interupt };
        }
    };
    // TODO: teleportTrapRoom

    export const shopRoom: BaseRoom = {
        name: "shop",
        type: "shop",
        displayName: "商店",
        probabilty: 10,
        description: "房间里有一个穿着兜帽，看不清面庞的怪人，似乎在兜售一些小玩意。（请等待后续更新商店）",
        items: { [RoomRemainingItemsKey]: 10 }
    };
    export const stairRoom: BaseRoom = {
        name: "stair",
        type: "stair",
        displayName: "阶梯",
        probabilty: 0,
        description: "房间里有一个传送阵，似乎就是通向迷宫下一层的路呢。可以使用entermaze指令进入下一层。",
        items: { [RoomRemainingItemsKey]: 5 },
    };

    [blankRoom, springRoom, fallTrapRoom, shopRoom, stairRoom, sleepTrapRoom, tentacleTrapRoom, amnesiaTrapRoom].forEach((room) => {
        registerRoom(room);
    })

    export const getOtherPlayersInCell = async (database: Database, cellId: number, selfId?: string) => {
        const users = await database.get('user', { mazecellid: [cellId] }, ["id", "rpgname", "rpgstatus", "rpgstate", "appearance"]);
        return users.filter((u) => u.id != selfId);
    };

    export const getEnterCellMsg = async (database: Database, cell: { id: number, door: number, room: string }, selfId: string) => {
        const room = Room.RoomRegistry[cell.room];
        let msg: string[] = [];
        msg.push(room.description);
        let players = await getOtherPlayersInCell(database, cell.id, selfId);
        if (players.length > 0) {
            const playersUnion: Record<string, string[]> = {};
            let needHelp = false;
            players.forEach((p) => {
                const stateMsg = State.describeState(p.rpgstate);
                if (stateMsg && !needHelp) {
                    needHelp = true;
                }
                playersUnion[stateMsg] ||= [];
                playersUnion[stateMsg].push(p.rpgname);
            });
            const playersMsg = Object.entries(playersUnion).map(([stateMsg, names]) => `${stateMsg}${names.join("、")}`).join(", ");
            msg.push(`你还在房间里看到了${playersMsg}。`);
            if (needHelp) {
                return `可以使用aid指令帮助受难的朋友呢。`;
            }
        }
        msg.push(Room.getDoorDescription(cell.door));
        return msg.join("\n");
    };

    export const onEnterCell = async (database: Database, mazeId: number, cellNo: number,
        user: UserInCell) => {
        const cell = (await database.get("mazecell", { mazeId: [mazeId], cell: [cellNo] }, ["id", "door", "room"]))[0];
        user.mazecellid = cell.id;
        let firstVisit = true;
        if (user.rpgrecords == null) {
            user.rpgrecords = { visited: [cellNo], logs: [] };
        } else if (!user.rpgrecords.visited.includes(cellNo)) {
            user.rpgrecords.visited.push(cellNo);
        } else {
            firstVisit = false;
        }
        let msg = "";
        const room = Room.RoomRegistry[cell.room];
        let interupt = false;
        if (Room.isTrapRoom(room)) {
            if (firstVisit) {
                const maze = await database.getMazeById(mazeId, ["level", "width", "height", "id"]);
                const enterResult = await room.onEnter(user, maze, database);
                msg += enterResult.msg;
                interupt = enterResult.interupt;
            } else {
                msg += `凭着记忆，你躲开了房间中的陷阱。`;
            }
        }
        if (!interupt) {
            msg += await getEnterCellMsg(database, cell, user.id);
        }
        return msg;
    };
}