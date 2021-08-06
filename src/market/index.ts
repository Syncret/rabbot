import { Context } from "koishi";
export interface Config {
}

export function apply(ctx: Context, config?: Config) {
    const rootCommand = ctx.command("market", "A stock market simulation");
    const database = ctx.database;
    rootCommand.subcommand("市场", "查看今日行情")
        .userFields(["id", "money"])
        .action(async ({ session, options },) => {
            const info = await database.getAllStockInfo();
        });

}

export const name = "Market";