import { Context, Random, Tables } from "koishi";
import { State } from "./state";
import { generateMaze, MazeDirection, parseCellDoorCode } from "./maze.util";
import { assert } from "../util";
import { Room } from "./room";

const defaultWidth = 8;
const defaultHeight = 8;
const defaultOpenGatePeople = 4;


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
        const users = await database.get('user', { mazecellid: [cellId] }, ["id", "onebot", "rpgname", "rpgstatus", "rpgstate", "appearance"]);
        return users.filter((u) => u.onebot != selfId);
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
    const getCellById: <F extends Tables.Field<"mazecell">>(id: number, fields?: F[]) => Promise<Pick<Tables["mazecell"], F>> = async (id, fields) => {
        return (await database.get("mazecell", [id], fields))[0];
    }
    const getMazeById: <F extends Tables.Field<"maze">>(id: number, fields?: F[]) => Promise<Pick<Tables["maze"], F>> = async (id, fields) => {
        return (await database.get("maze", [id], fields))[0];
    }

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
                    name = session.channelId + "的迷宫";
                }
                name += "的迷宫";
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
            session?.sendQueued("生成迷宫中...");
            await createMaze(name, width, height, session?.channelId!, 0);
            return `${name}初始化完毕。可以开始冒险啦！`;
        });

    ctx.command('rpg/entermaze ', '进入迷宫', { hidden: true })
        .alias("进入迷宫")
        .userFields(["rpgstate", "rpgname", "mazecellid"])
        .check(State.stateChecker({ [State.inMaze]: false }))
        .action(async ({ session }) => {
            const user = session?.user!;
            const mazes = await database.get("maze", { channelId: [session?.channelId!], level: [0] }, ["id", "width", "height", "name"]);
            if (mazes.length === 0) { // no existing maze for this channel
                return "本群还没有迷宫，请使用createMaze指令生成迷宫。";
            }
            let msg: string[] = [];
            const maze = mazes[0];
            msg.push(`在${maze.name}中发现了一个迷宫。为了探查异变，${user.rpgname}决定去迷宫一探究竟。\n你来到迷宫所在，入口似乎是一个传送阵。你迈上传送阵，经历了一阵头晕目眩后，来到了一个房间。`);
            const startCell = Random.int(maze.width * maze.height);
            const cell = (await database.get("mazecell", { mazeId: [maze.id], cell: [startCell] }, ["id", "door", "room"]))[0];
            msg.push(await getEnterCellMsg(cell, session?.userId!));
            user.mazecellid = cell.id;
            user.rpgstate |= State.inMaze;
            return msg.join("\n");
        });

    ctx.command('rpg/move <direction:string>', '向指定方向(东南西北)移动')
        .alias("移动")
        .userFields(["rpgstate", "rpgname", "mazecellid"])
        .check(State.stateChecker(State.inMaze))
        .action(async ({ session }, direction) => {
            const user = session?.user!;
            const cells = await database.get("mazecell", [user.mazecellid], ["id", "door", "room", "mazeId", "cell"]);
            const cell = cells[0];
            const doors = parseCellDoorCode(cell.door);
            let innerDirection = direction as MazeDirection;
            if (!doors[innerDirection]) {
                innerDirection = Room.RoomDirectionMap.get(direction) as MazeDirection;
                if (!innerDirection) {
                    return "方向无效。"
                }
                if (!doors[innerDirection]) {
                    return "这个方向没有门呢。"
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
            const targetCell = (await database.get("mazecell", { mazeId: [cell.mazeId], cell: [targetCellNo] }, ["id", "door", "room"]))[0];
            user.mazecellid = targetCell.id;
            let msg = `你来到了${direction}边的房间。`;
            msg += await getEnterCellMsg(targetCell, session?.userId!);
            return msg;
        });

    ctx.command('rpg/observe <target:string>', '观察房间或指定对象')
        .alias("观察")
        .userFields(["rpgstate", "rpgname", "mazecellid"])
        .check(State.stateChecker(State.inMaze))
        .action(async ({ session }, target) => {
            const user = session?.user!;
            const cell = await getCellById(user.mazecellid, ["id", "door", "room", "mazeId", "cell"]);
            let msg = "";
            msg += `你环顾四周。`;
            msg += await getEnterCellMsg(cell, session?.userId!);
            return msg;
        });

    ctx.command('rpg/position', 'get current position', { hidden: true, authority: 3 })
        .userFields(["rpgstate", "mazecellid"])
        .check(State.stateChecker(State.inMaze))
        .action(async ({ session }, target) => {
            const user = session?.user!;
            const cell = await getCellById(user.mazecellid, ["mazeId", "cell"]);
            const maze = await getMazeById(cell.mazeId, ["width"]);
            let msg = `你的位置是x:${cell.cell % maze.width}, y:${Math.floor(cell.cell / maze.width)}`;
            return msg;
        });
}

export const RPGMaze = {
    name: "RPGMaze",
    apply
}