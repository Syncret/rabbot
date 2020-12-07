export const MessagePatterns: IMessagePattern[] = [
  {
    patterns: [/^[^不]*((fw|废物|白痴|baga)(兔兔|机器人))/i],
    responses: [
      "兔兔才不是{1}呢！",
      "说别人是{2}的人才是{2}呢！",
      "兔兔要被你们气死了！",
    ],
  },
  {
    patterns: [/^我也\.*$/],
    responses: ["兔兔也...", ,],
    interval: 30 * 1000,
  },
];

export interface IMessagePattern {
  patterns: Array<RegExp | string>;
  responses: string[];
  interval?: number;
}
