import { compareIgnoreCase } from "./util";

export const CQRegex = /\[CQ:(\w+).*?]/gi;

export const CQCodeType = {
  image: "image",
};
export interface CQCode {
  type: string;
  attributes: {
    file?: string;
    url?: string;
  } & Record<string, string>;
}

export function parseCQ(message: string): CQCode[] {
  if (!message) {
    return [];
  }
  const matches = message.match(CQRegex);
  const result: CQCode[] = [];
  for (const match of matches || []) {
    const groups = match
      .substr(1, match.length - 2)
      .split(",")
      .map((s) => s.trim());
    const type = (groups.shift() || "").substr(3);
    const attributes: Record<string, string> = {};
    groups.forEach((group) => {
      const pair = group.split("=").map((s) => s.trim());
      attributes[pair[0]] = pair[1];
    });
    result.push({ type, attributes });
  }
  return result;
}

export function removeCQ(message: string): string {
  return (message || "").replace(CQRegex, "");
}

export function getCQImageUrlFromMsg(message: string): string | undefined {
  const CQs = parseCQ(message);
  const sampleCode = CQs[0];
  if (!compareIgnoreCase(sampleCode && sampleCode.type, CQCodeType.image)) {
    return undefined;
  }
  return sampleCode.attributes.url;
}
