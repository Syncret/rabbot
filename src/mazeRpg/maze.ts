import { Context, Random, segment, Tables } from "koishi";
import { Maze } from "./database";
import { State } from "./state";
import { generateMaze, MazeDirection, parseCellDoorCode } from "./maze.util";
import { assert } from "../util";
import { getDiceMsg, min } from "./util";
import { Room } from "./room";
import { Player } from "./player";

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
                room = Room.stairRoom.name;
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
        await Promise.all(cellPromises);
        return maze;
    };
    const getPlayerInCell = async <F extends Tables.Field<"user">>(cellId: number, name: string, fields: F[]) => {
        if (!name) {
            return "请指定目标角色。";
        }
        const users = await database.get('user', { mazecellid: [cellId], rpgname: [name] }, fields);
        if (users.length === 0) {
            return "找不到此角色呢。";
        } else if (users.length === 1) {
            return users[0];
        } else {
            const nameparts = name.split("#");
            if (nameparts.length > 1) {
                const index = Number(nameparts[1]);
                if (index > 0) {
                    return users[index] || `找不到第${index}位${nameparts[0]}。`;
                }
            }
            return users[0];
        }
    }
    ctx.command('rpg/maze', '迷宫相关指令');
    ctx.command('rpg/maze/createmaze <name:string>', '生成迷宫', { hidden: true, authority: 3 })
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

    ctx.command('rpg/maze/mazeinfo', 'get/set maze information', { hidden: true, authority: 3 })
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

    ctx.command('rpg/maze/entermaze', '进入(下一层)迷宫')
        .alias("进入迷宫")
        .userFields(["rpgstate", "rpgname", "mazecellid", "id", "rpgrecords", "rpgap", "rpgstatus", "timers", "rpgrecords"])
        .check(State.stateChecker(State.active, State.sleep | State.tentacle))
        .action(async ({ session }) => {
            const user = session?.user!;
            let msgs: string[] = [];
            let targetMaze: Pick<Maze, "width" | "height" | "id">;
            if (State.hasState(user.rpgstate, State.inMaze)) {
                const cell = await database.getCellById(user.mazecellid, ["mazeId", "room"]);
                const room = Room.RoomRegistry[cell.room];
                if (room.type !== Room.stairRoom.type) {
                    return "这里没有办法进入下一层迷宫呢。"
                }
                const maze = await database.getMazeById(cell.mazeId, ["level", "name", "width", "height", "id"]);
                const nextmazes = await database.get("maze", { channelId: [session?.channelId!], level: [maze.level + 1] }, ["id", "width", "height", "name"]);
                if (nextmazes.length === 0) {
                    if (maze.level === 1) {
                        return "现在只开放第二层迷宫呢。敬请等待更新。";
                    }
                    const newmaze = await createMaze(maze.name, maze.width, maze.height, session?.channelId!, maze.level + 1);
                    targetMaze = newmaze;
                } else {
                    targetMaze = nextmazes[0];
                }
                msgs.push("你启动了传送阵，一阵头晕目眩后，来到了下一层的迷宫。");
            } else {
                const mazes = await database.get("maze", { channelId: [session?.channelId!], level: [0] }, ["id", "width", "height", "name"]);
                if (mazes.length === 0) { // no existing maze for this channel
                    return "本群还没有迷宫，请使用createMaze指令生成迷宫或指定其他迷宫。";
                }
                const maze = mazes[0];
                msgs.push(`相传人们在群里发现了一个叫做${maze.name}的迷宫。为了探查异变，${user.rpgname}决定去迷宫一探究竟。\n你来到迷宫所在，入口似乎是一个传送阵，迈上去后，经历了一阵头晕目眩，你来到了一个房间。`);
                targetMaze = maze;
            }
            const startCell = Random.int(targetMaze.width * targetMaze.height);
            msgs.push(await Room.onEnterCell(database, targetMaze.id, startCell, user));
            user.rpgstate |= State.inMaze;
            user.rpgrecords.visited = [];

            return msgs.join("\n");
        });

    ctx.command('rpg/maze/move <direction:string>', '向指定方向(东南西北)移动')
        .alias("移动")
        .userFields(["rpgstate", "rpgname", "mazecellid", "timers", "rpgap", "id", "rpgrecords", "rpgstatus"])
        .check(State.stateChecker(State.inMaze, State.sleep | State.tentacle))
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
            msg += await Room.onEnterCell(database, cell.mazeId, targetCellNo, user);
            msg += State.consumeAP(user, 1);
            return msg;
        });

    ctx.command('rpg/maze/observe <target:string>', '观察房间或指定对象')
        .alias("观察")
        .userFields(["rpgstate", "rpgname", "mazecellid", "id", "timers"])
        .check(State.stateChecker(State.inMaze, State.sleep))
        .action(async ({ session }, target) => {
            const user = session?.user!;
            if (target) {
                const player = await getPlayerInCell(user.mazecellid, target, ["appearance", "rpgstate", "rpgstatus"]);
                if (typeof player === "string") {
                    return player;
                }
                return target + Player.describeAppearance(player.appearance, player.rpgstatus) + State.describeState(player.rpgstate);
            }
            const cell = await database.getCellById(user.mazecellid, ["id", "door", "room", "mazeId", "cell"]);
            let msg = "";
            msg += `你环顾四周。`;
            msg += await Room.getEnterCellMsg(database, cell, user.id);
            return msg;
        });

    ctx.command('rpg/maze/aid <target:string>', '帮助指定角色')
        .alias("帮助角色")
        .userFields(["rpgstate", "rpgname", "mazecellid", "id", "timers", "rpgstatus"])
        .check(State.stateChecker(State.inMaze, State.sleep | State.tentacle))
        .action(async ({ session }, target) => {
            const user = session?.user!;
            const player = await getPlayerInCell(user.mazecellid, target, ["id", "rpgstate", "rpgstatus", "rpgname", session?.platform!]);
            if (typeof player === "string") {
                return player;
            }
            let msg = "";
            if (State.hasState(player.rpgstate, State.sleep)) {
                await database.update("user", [{ id: player.id, rpgstate: player.rpgstate ^= State.sleep }]);
                msg += `你轻轻地叫醒了${player.rpgname}。`;
                msg += segment.at(player[session?.platform!]) + `醒来啦。`;
                return msg;
            } else if (State.hasState(player.rpgstate, State.tentacle)) {
                const target = 3;
                const range = 6;
                const dice = Random.int(range) + 1;
                msg += getDiceMsg(dice, range, target);
                const maze = await database.getMazeByCellId(user.mazecellid, ["level"]);
                if (dice > target) {
                    msg += `你小心地把${player.rpgname}从触手中扯出来。`;
                    msg += segment.at(player[session?.platform!]) + `从触手中挣脱出来啦。`;
                    await database.update("user", [{ id: player.id, rpgstate: player.rpgstate ^= State.tentacle }]);
                } else if (dice === target) {
                    msg += `你成功地救出了${player.rpgname}，但是一不小心，自己却被触手缠住了...`;
                    player.rpgstate ^= State.tentacle;
                    Room.tentacleTrapRoom.onTrap(user, maze.level);
                    await database.update("user", [{ id: player.id, rpgstate: player.rpgstate ^= State.tentacle }]);
                }
                else if (dice === 1) {
                    msg += `大失败！你不仅没能救出${player.rpgname}, 连你自己也被触手缠住了！`;
                    Room.tentacleTrapRoom.onTrap(user, maze.level);
                } else {
                    msg += `你尝试解救${player.rpgname}，但是触手缠得实在是太紧了，没能成功...`;
                }
            } else {
                msg += `${player.rpgname}看上去似乎没有什么需要帮忙的呢。`;
            }
            return msg;
        });

    ctx.command("rpg/maze/rest <ap:number>", "休息")
        .option("ap", "-a <ap:number> 指定消耗的体力")
        .userFields(["rpgstate", "rpgstatus", "rpgap", "timers", "mazecellid"])
        .check(State.stateChecker(State.inMaze, State.sleep | State.tentacle))
        .check(State.apChecker(true))
        .action(async ({ session, options = {} }, ap) => {
            const user = session?.user!;
            const cell = await database.getCellById(user.mazecellid, ["mazeId", "cell", "room"]);
            const room = Room.RoomRegistry[cell.room];
            let msg = "";
            let coefficient = 1;
            if (room.type !== "rest") {
                msg += `附近的环境令你感到不安，你勉勉强强地休息了一阵。`;
            } else {
                msg += `附近的环境令你感到放松，你舒服地休息了一阵！`;
                coefficient = room.effect || 10;
            }
            msg += `你恢复了${ap * coefficient}点生命与魔力。`
            msg += State.consumeAP(user, ap);
            user.rpgstatus.hp = min(user.rpgstatus.hp + ap * coefficient, Player.maxHp(user.rpgstatus));
            user.rpgstatus.mp = min(user.rpgstatus.mp + ap * coefficient, Player.maxHp(user.rpgstatus));
            return msg;
        });

    ctx.command('rpg/maze/position', 'get current position')
        .userFields(["rpgstate", "mazecellid", "timers"])
        .option("detail", "-d 详细位置", { authority: 3 })
        .check(State.stateChecker(State.inMaze))
        .action(async ({ session, options = {} }) => {
            const user = session?.user!;
            const cell = await database.getCellById(user.mazecellid, ["mazeId", "cell"]);
            const maze = await database.getMazeById(cell.mazeId, ["width", "level", "name"]);
            let msg = "";
            if (options.detail) {
                msg = `${maze.name} x:${cell.cell % maze.width}, y:${Math.floor(cell.cell / maze.width)}, l:${maze.level}`;
            } else {
                msg = `你现在在${maze.name}迷宫第${maze.level}层。`
            }
            return msg;
        });
}

export const RPGMaze = {
    name: "RPGMaze",
    apply
}