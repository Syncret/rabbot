import { Context } from "koishi";

export const PostPlugins = {
  name: "PostPlugins",
  apply: (ctx: Context) => {
    ctx.command("shot", { authority: 3 });
    ctx.command("recalled", { authority: 3 });
  },
};