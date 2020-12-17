export const MessagePatterns: IMessagePattern[] = [
  {
    patterns: [/^[^不]*((fw|five|废物|白痴|baga|baka|巴嘎|八嘎|辣鸡)(兔兔|机器人))/i],
    responses: [
      "兔兔才不是{1}呢！",
      "说别人是{2}的人才是{2}呢！",
      "兔兔要被你们气死了！",
    ],
  },
  {
    patterns: [/^兔兔(呢|在|去哪|？|\?|！|!|$)/],
    responses: [
      "嗯？",
      "有事吗",
      "活着呢",
      "嗯哼",
      "Kira!",
      "什么？",
      "兔兔去远方了",
      "别喊啦",
      "(✧◡✧)/",
    ],
  },
  {
    patterns: [/^我也\.*$/],
    responses: ["兔兔也...", ,],
    interval: 30 * 1000,
  },
  {
    patterns: [/^震惊$/],
    responses: ["SHOCK！", , ,],
    interval: 30 * 1000,
  },
  {
    patterns: [/^这样啊\.*$/],
    responses: ["そう…ですか…", , ,],
    interval: 30 * 1000,
  },
  {
    patterns: [/^好厉害\.*$/],
    responses: ["すごい…", , ,],
    interval: 30 * 1000,
  },
];

export interface IMessagePattern {
  patterns: Array<RegExp | string>;
  responses: string[];
  interval?: number;
}
