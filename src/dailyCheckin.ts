import { Context } from "koishi-core";
import { checkinList } from "./dailyCheckin.config";
import axios from "axios";

export interface Options {}

export const DailyCheckin = {
  name: "DailyCheckin",
  apply: (ctx: Context, options: Options) => {
    ctx
      .command("checkin", "Do daily Checkin", { authority: 4, hidden: true })
      .action(async ({ session }) => {
        if (!session) {
          return;
        }
        if (checkinList == null || checkinList.length === 0) {
          session.sendQueued("No checkin specified.");
        }
        checkinList.map(async (ci) => {
          try {
            if (ci.method === "POST") {
              const response = await axios.post(ci.url, undefined, {
                headers: {
                  cookie: ci.cookie,
                },
                timeout: 60000,
              });
              session.sendQueued(ci.url + "\n" + JSON.stringify(response.data));
            }
          } catch (e) {
            session.sendQueued("Error" + e.message);
            throw e;
          }
        });
      });
  },
};
