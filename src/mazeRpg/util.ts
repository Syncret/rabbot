import { Random, Time } from "koishi-utils";

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
export function createMutualMap<T, V>(values: [T, V][]): Map<T | V, V | T> {
    const result = new Map<T | V, V | T>();
    for (const [key, value] of values) {
        result.set(key, value);
        result.set(value, key);
    }
    return result;
}

export function getRemainingTime(time: number, unit = Time.hour): string {
    return ((time - Date.now()) / unit).toFixed(2);
}
export function getDiceMsg(dice: number, range: number, target: number): string {
    const operator = dice > target ? ">" : (dice === target ? "=" : "<");
    return `1d${range}=${dice}${operator}${target}。`;
}

export function implementType<T>() {
    return <U extends T>(u: U) => u;
}

export function getLevelAmend(userLevel: number, mazeLevel: number): number {
    return 0; // since we don't have real level yet
}