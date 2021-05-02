import { Context, Random } from "koishi";
import { State } from "./state";
import { generateMaze } from "./maze.util";

const defaultWidth = 8;
const defaultHeight = 8;

function apply(ctx: Context) {
    const { database } = ctx;
    ctx.command('rpg/createMaze <name:string>', '生成迷宫', { hidden: true, authority: 3 })
        .alias("生成迷宫")
        .action(async ({ session }) => {
            const mazes = await database.get("maze", { channelId: [session?.channelId!], level: [0] }, ["id", "width", "height"]);
            if (mazes.length === 0) { // no existing maze for this channel
                session?.sendQueued("生成迷宫中...");
                const maze = await database.create('maze', {
                    channelId: session?.channelId,
                    level: 0,
                    width: defaultWidth,
                    height: defaultHeight,
                });
                const mazeId = maze.id;
                const mazeCells = generateMaze(maze.width, maze.height);
                mazeCells.map((value, index) => {
                    database.create('mazeCell', {
                        mazeId,
                        cell: index,
                        door: value,
                        type: 0
                    });
                })
            } else {
                return "已经有迷宫啦。"
            }
            return "";
        });
    ctx.command('rpg/startMaze ', 'start maze', { hidden: true })
        .userFields(["rpgstate", "mazeCellId"])
        .check(State.stateChecker())
        .action(async ({ session }) => {
            const user = session?.user!;
            if (user.mazeCellId) {
                return "已经在一个迷宫中啦";
            }
            const mazes = await database.get("maze", { channelId: [session?.channelId!], level: [0] }, ["id", "width", "height"]);
            if (mazes.length === 0) { // no existing maze for this channel
                session?.sendQueued("未发现已有迷宫，生成迷宫中...");
                const maze = await database.create('maze', {
                    channelId: session?.channelId,
                    level: 0,
                    width: defaultWidth,
                    height: defaultHeight,
                });
                const mazeId = maze.id;
                const mazeCells = generateMaze(maze.width, maze.height);
                mazeCells.map((value, index) => {
                    database.create('mazeCell', {
                        mazeId,
                        cell: index,
                        door: value,
                        type: 0
                    });
                })
            } else {

            }

            return ``;
        });
}

export const RPGMaze = {
    name: "RPGMaze",
    apply
}