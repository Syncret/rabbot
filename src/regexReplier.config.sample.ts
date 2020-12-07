export const MessagePatterns: IMessagePattern[] = [
  {
    patterns: [/test/i],
    responses: ["test"],
  },
];

export interface IMessagePattern {
  patterns: Array<RegExp | string>;
  responses: string[];
}
