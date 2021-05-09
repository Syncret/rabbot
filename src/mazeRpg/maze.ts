import { Context, Random, Tables, Time, User } from "koishi";
import { State } from "./state";
import { generateMaze, MazeDirection, parseCellDoorCode } from "./maze.util";
import { assert } from "../util";
import { Room } from "./room";

const defaultWidth = 8;
const defaultHeight = 8;
const defaultOpenGatePeople = 4;
const maxMazeNameLength = 20;


function apply(ctx: Context) {
    const { database } = ctx;

    const createMaze = async (name: string, width: number, height: number, channelId: string, level: number) => {
        const maze = await database.create('maze', {
            channelId: channelId,
            level: level,
            width,
            height,
            name
        });
        const mazeId = maze.id;
        const mazecells = generateMaze(maze.width, maze.height);
        const endCell = Random.int(maze.width * maze.height);
        const cellPromises = mazecells.map((value, index) => {
            let room: string;
            if (index === endCell) {
                room = Room.StairRoom.name;
            } else {
                room = Random.weightedPick(Room.RoomProbMap);
            }
            const roomDate = Room.RoomRegistry[room];
            return database.create('mazecell', {
                mazeId,
                cell: index,
                door: value,
                room: room,
                items: Object.assign({}, roomDate.items)
            });
        });
        return Promise.all(cellPromises);
    };
    const getOtherPlayersInCell = async (cellId: number, selfId?: string) => {
        const users = await database.get('user', { mazecellid: [cellId] }, ["id", "rpgname", "rpgstatus", "rpgstate", "appearance"]);
        return users.filter((u) => u.id != selfId);
    };
    const getEnterCellMsg = async (cell: { id: number, door: number, room: string }, selfId: string) => {
        const room = Room.RoomRegistry[cell.room];
        let msg: string[] = [];
        msg.push(room.description);
        let players = await getOtherPlayersInCell(cell.id, selfId);
        if (players.length > 0) {
            msg.push(`你还在房间里看到了${players.map((p) => p.rpgname).join(', ')}。`);
        }
        msg.push(Room.getDoorDescription(cell.door));
        return msg.join("\n");
    };
    const onEnterCell = async (mazeId: number, cellNo: number, user: User.Observed<"rpgrecords" | "mazecellid" | "id" | "rpgstatus" | "rpgap">) => {
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
        if (Room.isTrapRoom(room)) {
            if (firstVisit) {
                const maze = await database.getMazeById(mazeId, ["level"]);
                const prob = 1 + (maze.level - user.rpgstatus.level) / 10;
                const escape = Math.random() > prob;
                msg += `你触发了${room.displayName}！`;
                if (escape) {
                    msg += `但是你成功地躲了过去！`;
                } else {
                    const damage = Math.floor(room.effect * (Math.random() + 0.5));
                    user.rpgstatus.hp -= damage;
                    msg += `你受到了${damage}点伤害！剩余hp ${user.rpgstatus.hp}。`;
                    if (user.rpgstatus.hp <= 0) {
                        const penalty = Math.floor(Time.day / State.apRecoverInterval);
                        msg += `你死掉了呢...体力已扣为-${penalty}点，可等体力恢复正值后行动。`;
                        user.rpgap = -penalty;
                        user.rpgstatus.hp = 1;
                    }
                }
            } else {
                msg += `凭着记忆，你躲开了房间中的陷阱。`;
            }
        }
        msg += await getEnterCellMsg(cell, user.id);
        return msg;
    };

    ctx.command('rpg/createmaze <name:string>', '生成迷宫', { hidden: true, authority: 3 })
        .alias("生成迷宫")
        .option("size", `-s <size:string>  指定迷宫尺寸（长x宽，默认8x8)`)
        .option("gate", `-g <gate:number>  指定开启下一层需要的人数`)
        .action(async ({ session, options = {} }, name) => {
            session = session!;
            const mazes = await database.get("maze", { channelId: [session?.channelId!], level: [0] }, ["id", "width", "height"]);
            if (!name) {
                if (session.groupId) {
                    name = (await session.bot.getGroup(session.groupId)).groupName;
                } else {
                    name = session.channelId!;
                }
            } else {
                if (name.length > maxMazeNameLength) {
                    return `迷宫名字过长，不能超过${maxMazeNameLength}字符。`
                }
            }
            if (mazes.length > 0) {
                return "已经有迷宫啦。"
            }
            let width = defaultWidth;
            let height = defaultHeight;
            let gate = defaultOpenGatePeople;
            let msg = "";
            if (options.size) {
                [width, height] = options.size.split(/x|*/).map((l) => Number(l));
                msg += assert(typeof width === "number" && width > 0 && width < 13, "输入宽度不合法", true);
                msg += assert(typeof height === "number" && height > 0 && height < 13, "输入长度不合法", true);
            }
            if (options.gate) {
                gate = options.gate;
                msg += assert(typeof gate === "number" && gate > 0, "输入人数不合法", true);
            }
            if (msg) {
                return msg;
            }
            await createMaze(name, width, height, session?.channelId!, 0);
            return `一个名为${name}的迷宫突然被人们发现，一时吸引了许多冒险者的目光。`;
        });

    ctx.command('rpg/maze', 'get/set maze information', { hidden: true, authority: 3 })
        .option("list", "-l list all mazes")
        .option("rename", "-r <rename:string>")
        .action(async ({ session, options }) => {
            const query = options?.list ? { level: [0] } : { channelId: [session?.channelId!] };
            const mazes = await database.get("maze", query, ["id", "name", "width", "height", "channelId", "level"]);
            if (mazes.length === 0) {
                return "无迷宫记录。"
            }
            let msg = mazes.map((maze) => `${maze.id}: ${maze.name}, 群${maze.channelId}, ${maze.width}X${maze.height}, 层${maze.level}`).join("\n");
            if (options?.list) {
                return msg;
            }
            if (options?.rename) {
                const name = options.rename;
                if (name.length > maxMazeNameLength) {
                    return `迷宫名字过长，不能超过${maxMazeNameLength}字符。`
                }
                const updateMaze = mazes.map((m) => ({ id: m.id, name: name, channelId: m.channelId }));
                await database.update("maze", updateMaze);
                return `更新迷宫名为${name}`;
            }
            return msg;
        });

    ctx.command('rpg/entermaze', '进入迷宫')
        .alias("进入迷宫")
        .userFields(["rpgstate", "rpgname", "mazecellid", "id", "rpgrecords", "rpgap", "rpgstatus"])
        .check(State.stateChecker({ [State.inMaze]: false }))
        .action(async ({ session }) => {
            const user = session?.user!;
            const mazes = await database.get("maze", { channelId: [session?.channelId!], level: [0] }, ["id", "width", "height", "name"]);
            if (mazes.length === 0) { // no existing maze for this channel
                return "本群还没有迷宫，请使用createMaze指令生成迷宫或指定其他迷宫。";
            }
            let msg: string[] = [];
            const maze = mazes[0];
            msg.push(`相传人们在群里发现了一个叫做${maze.name}的迷宫。为了探查异变，${user.rpgname}决定去迷宫一探究竟。\n你来到迷宫所在，入口似乎是一个传送阵，迈上去后，经历了一阵头晕目眩，你来到了一个房间。`);
            const startCell = Random.int(maze.width * maze.height);
            msg.push(await onEnterCell(maze.id, startCell, user));
            user.rpgstate |= State.inMaze;
            return msg.join("\n");
        });

    ctx.command('rpg/move <direction:string>', '向指定方向(东南西北)移动')
        .alias("移动")
        .userFields(["rpgstate", "rpgname", "mazecellid", "timers", "rpgap", "id", "rpgrecords", "rpgstatus"])
        .check(State.stateChecker(State.inMaze))
        .check(State.apChecker())
        .action(async ({ session }, direction) => {
            const user = session?.user!;
            const cells = await database.get("mazecell", [user.mazecellid], ["id", "door", "room", "mazeId", "cell"]);
            const cell = cells[0];
            const doors = parseCellDoorCode(cell.door);
            let innerDirection = direction as MazeDirection;
            if (!doors[innerDirection]) {
                innerDirection = Room.RoomDirectionMap.get(direction) as MazeDirection;
                const doorMsg = Room.getDoorDescription(cell.door);
                if (!innerDirection) {
                    return "方向无效。" + doorMsg;
                }
                if (!doors[innerDirection]) {
                    return "这个方向没有门呢。" + doorMsg;
                }
            }
            let targetCellNo = cell.cell;
            if (innerDirection === "left" || innerDirection === "right") {
                innerDirection === "left" ? targetCellNo -= 1 : targetCellNo += 1;
            } else if (innerDirection === "up" || innerDirection === "down") {
                const mazes = await database.get("maze", [cell.mazeId], ["width", "height"]);
                const width = mazes[0].width;
                innerDirection === "up" ? targetCellNo -= width : targetCellNo += width;
            } else {
                return `是不认识的方向${innerDirection}...`;
            }
            let msg = `你来到了${direction}边的房间。`;
            msg += await onEnterCell(cell.mazeId, targetCellNo, user);
            msg += State.consumeAP(user, 1);
            return msg;
        });

    ctx.command('rpg/observe <target:string>', '观察房间或指定对象')
        .alias("观察")
        .userFields(["rpgstate", "rpgname", "mazecellid", "id"])
        .check(State.stateChecker(State.inMaze))
        .action(async ({ session }, target) => {
            const user = session?.user!;
            const cell = await database.getCellById(user.mazecellid, ["id", "door", "room", "mazeId", "cell"]);
            let msg = "";
            msg += `你环顾四周。`;
            msg += await getEnterCellMsg(cell, user.id);
            return msg;
        });

    ctx.command('rpg/position', 'get current position', { hidden: true, authority: 3 })
        .userFields(["rpgstate", "mazecellid"])
        .check(State.stateChecker(State.inMaze))
        .action(async ({ session }) => {
            const user = session?.user!;
            const cell = await database.getCellById(user.mazecellid, ["mazeId", "cell"]);
            const maze = await database.getMazeById(cell.mazeId, ["width"]);
            let msg = `你的位置是x:${cell.cell % maze.width}, y:${Math.floor(cell.cell / maze.width)}`;
            return msg;
        });
}

export const RPGMaze = {
    name: "RPGMaze",
    apply
}