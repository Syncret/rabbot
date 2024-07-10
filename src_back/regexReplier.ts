import { Context } from "koishi-core";
import { MessagePatterns } from "./regexReplier.config";

export interface Options {}

const MessagePatternsRuntime = (MessagePatterns || []).map((pattern) => {
  return {
    ...pattern,
    timer: 0, // store the time the regex should be triggered, used when the pattern has throttle interval time
  };
});

function getCandidateResponse(
  responses: (string | undefined)[]
): string | undefined {
  if (responses.length > 1) {
    return responses[Math.floor(responses.length * Math.random())];
  } else {
    return responses[0];
  }
}

function getResponse(message?: string): string | undefined {
  if (!message) {
    return;
  }
  const time = new Date().getTime();
  for (const item of MessagePatternsRuntime) {
    if (time < item.timer) {
      return undefined;
    }
    let candidate: string | undefined;
    for (const pattern of item.patterns) {
      if (typeof pattern === "string") {
        if (message === pattern) {
          candidate = getCandidateResponse(item.responses);
        }
      } else if (pattern instanceof RegExp) {
        const matchResult = pattern.exec(message);
        if (matchResult) {
          candidate = getCandidateResponse(item.responses);
          if (candidate) {
            for (let i = 0; i < matchResult.length; i++) {
              candidate = candidate.replace(
                new RegExp(`\\{${i}\\}`, "g"),
                matchResult[i]
              );
            }
          }
        }
      }
      if (candidate) {
        if (item.interval) {
          item.timer = time + item.interval;
        }
        return candidate;
      }
    }
  }
  return undefined;
}

export function apply(ctx: Context, options: Options) {
  ctx.middleware((session, next) => {
    const response = getResponse(session.content);
    if (response) {
      return session.send(response);
    } else {
      return next();
    }
  });
}

export const name = "RegexReplier";
