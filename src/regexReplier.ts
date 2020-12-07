import { Context } from "koishi-core";
import { MessagePatterns } from "./regexReplier.config";

export interface Options {}

function getCandidateResponse(responses: string[]): string {
  if (responses.length > 1) {
    return responses[Math.floor(responses.length * Math.random())];
  } else {
    return responses[0];
  }
}

function getResponse(message: string): string | undefined {
  if (!message) {
    return;
  }
  for (const item of MessagePatterns) {
    for (const pattern of item.patterns) {
      if (typeof pattern === "string") {
        if (message === pattern) {
          return getCandidateResponse(item.responses);
        }
      } else if (pattern instanceof RegExp) {
        const matchResult = pattern.exec(message);
        if (matchResult) {
          let candidate = getCandidateResponse(item.responses);
          if (candidate) {
            for (let i = 0; i < matchResult.length; i++) {
              candidate = candidate.replace(
                new RegExp(`\\{${i}\\}`, "g"),
                matchResult[i]
              );
            }
          }
          return candidate;
        }
      }
    }
  }
  return undefined;
}

function test(): void {
  ["废物机器人", "tst2", "fw机器人","不是fw机器人呢","w机器人呢","ssbaga兔兔呢"]
    .map(getResponse)
    .filter((s) => !!s)
    .forEach((s)=>console.log(s));
}
test();

export function apply(ctx: Context, options: Options) {
  ctx.middleware((meta, next) => {
    const response = getResponse(meta.message);
    if (response) {
      meta.$send(response);
    } else {
      next();
    }
  });
}

export const name = "RegexReplier";
