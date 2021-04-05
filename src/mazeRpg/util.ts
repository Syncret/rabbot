import { Random } from "koishi-utils";

export function getEnumKeys<T extends string>(enumObject: Record<T, any>): T[] {
    return Object.values(enumObject).filter((e) => typeof e === "string") as T[];
}

export function pickEnumValue<T extends Object>(enumObject: Object): T {
    const values = Object.values(enumObject).filter((e) => typeof e === "number");
    return Random.pick(Array.from(values));
}

export function max(a: number, b: number): number {
    return a > b ? a : b;
}
export function min(a: number, b: number): number {
    return a < b ? a : b;
}