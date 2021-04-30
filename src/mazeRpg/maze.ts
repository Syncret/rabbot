import { Context, Random } from "koishi";
import { State } from "./state";

function apply(ctx: Context) {
    const { database } = ctx;
    ctx.command('rpg/startMaze ', 'start maze', { hidden: true })
        .userFields(["rpgstate", "mazeCellId"])
        .check(State.stateChecker())
        .action(async ({ session }) => {
            const user = session?.user!;
            if (user.mazeCellId) {
                return "已经在一个迷宫中啦";
            }
            const maze = await database.get("maze", { channelId: [session?.channelId!], cell: [0], level: [1] }, ["type"]);
            if (maze.length === 0) { // no existing maze for this channel
            } else {

            }

            return ``;
        });
}

export const RPGMaze = {
    name: "RPGMaze",
    apply
}