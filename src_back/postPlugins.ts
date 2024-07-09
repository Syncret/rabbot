import { Context } from "koishi";

export const name = "PostPlugins";
export function apply(ctx: Context) {
  ctx.command("shot", { authority: 2 });
};
