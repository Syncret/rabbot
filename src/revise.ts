import { Context, Time } from "koishi-core";

export const name = "Revise";
export function apply(ctx: Context) {
  ctx
    .command("revise", "Get date that needs to be revised.")
    .action(() => {
      const msg: string[] = [];
      let days = [50, 30, 15, 7, 4, 2, 1];
      days.forEach(function (day) {
        let a = new Date();
        a.setHours(a.getHours() + 8); // change to UTC+8
        a.setDate(a.getDate() - day);
        msg.push((a.getMonth() + 1) + '/' + (a.getDate()))
      });
      return msg.join("\n");
    });
}
