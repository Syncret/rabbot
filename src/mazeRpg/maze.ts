import { Context, Random } from "koishi";
import { State } from "./state";
import { generateMaze, parseCellDoorCode } from "./maze.util";
import { assert } from "../util";
import { Room } from "./room";

const defaultWidth = 8;
const defaultHeight = 8;
const defaultOpenGatePeople = 4;


function apply(ctx: Context) {
    const { database } = ctx;
    const createMaze = async (width: number, height: number, channelId: string, level: number) => {
        const maze = await database.create('maze', {
            channelId: channelId,
            level: level,
            width,
            height,
        });
        const mazeId = maze.id;
        const mazeCells = generateMaze(maze.width, maze.height);
        const endCell = Random.int(maze.width * maze.height);
        const cellPromises = mazeCells.map((value, index) => {
            let room: string;
            if (index === endCell) {
                room = Room.StairRoom.name;
            } else {
                room = Random.weightedPick(Room.RoomProbMap);
            }
            const roomDate = Room.RoomRegistry[room];
            return database.create('mazeCell', {
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
        const users = await database.get('user', { mazeCellId: [cellId] }, ["id", "rpgstatus", "rpgstate", "appearance"]);
        return users.filter((u) => u.id != selfId);
    };
    const getEnterCellMsg = async (mazeId: number, cellNumber: number, selfId: string) => {
        const cells = await database.get("mazeCell", { mazeId: [mazeId], cell: [cellNumber] }, ["id", "door", "room"]);
        const cell = cells[0];
        if (!cell) {
            return `数据库错误，无效位置${cellNumber}。`;
        }
        const room = Room.RoomRegistry[cell.room];
        let msg = "";
        msg += room.description;
        let players = await getOtherPlayersInCell(cell.id, selfId);
        if (players.length > 0) {
            msg += `你还在房间里看到了${players.map((p) => p.rpgstatus.name).join(', ')}。`;
        }
        msg += Room.getDoorDescription(cell.door);
        return msg;
    }
    ctx.command('rpg/createMaze <name:string>', '生成迷宫', { hidden: true, authority: 3 })
        .alias("生成迷宫")
        .option("size", `-s <size:string>  指定迷宫尺寸（长x宽，默认8x8)`)
        .option("gate", `-g <gate:number>  指定开启下一层需要的人数`)
        .action(async ({ session, options = {} }, name) => {
            const mazes = await database.get("maze", { channelId: [session?.channelId!], level: [0] }, ["id", "width", "height"]);
            if (mazes.length >= 0) {
                return "已经有迷宫啦。"
            }
            if (!name) {
                name = session?.groupName + "的迷宫";
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
            await createMaze(width, height, session?.channelId!, 0);
            return `${name}初始化完毕。可以开始冒险啦！`;
        });
    ctx.command('rpg/enterMaze ', 'enter current maze', { hidden: true })
        .alias("进入迷宫")
        .userFields(["rpgstate", "mazeCellId"])
        .check(State.stateChecker())
        .action(async ({ session }) => {
            const user = session?.user!;
            if (user.mazeCellId) {
                return "已经在一个迷宫中啦";
            }
            const mazes = await database.get("maze", { channelId: [session?.channelId!], level: [0] }, ["id", "width", "height", "name"]);
            if (mazes.length === 0) { // no existing maze for this channel
                return "本群还没有迷宫，请使用createMaze指令生成迷宫。";
            }
            let msg = "";
            const maze = mazes[0];
            msg += `今天是个好日子！你打算进${maze.name}一展身手。你来到迷宫所在，入口是一个古旧的传送阵。做好准备之后，你迈上了传送阵。在一阵头晕目眩后，你来到了一个房间。`
            const startCell = Random.int(maze.width * maze.height);
            msg += await getEnterCellMsg(maze.id, startCell, session?.userId!);
            return msg;
        });
}

export const RPGMaze = {
    name: "RPGMaze",
    apply
}