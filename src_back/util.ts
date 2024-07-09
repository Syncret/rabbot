import Axios, { AxiosRequestConfig } from "axios";
import * as crypto from "crypto-js";
import { promises } from "fs";

export const timeUnit = {
  second: "s",
  minute: "m",
  hour: "h",
  day: "d",
  month: "M",
};

export const timeUnitInMillis = {
  [timeUnit.second]: 1000,
  [timeUnit.minute]: 60 * 1000,
  [timeUnit.hour]: 60 * 60 * 1000,
  [timeUnit.day]: 24 * 60 * 60 * 1000,
  [timeUnit.month]: 30 * 24 * 60 * 60 * 1000,
};

export function String2TimeInterval(time: string): number {
  const units = Object.values(timeUnit).join("|");
  const regex = new RegExp(`(\\d+)\\s*(${units})`, "g");
  let timeInMs = 0;
  let match: RegExpExecArray | null;
  let x: number = 0;
  while ((match = regex.exec(time))) {
    x = Number(match[1]) * (timeUnitInMillis[match[2]] || 0);
    timeInMs += x;
  }
  return x ? timeInMs : NaN;
}

export function TimeInterval2String(time: number) {
  const unitEntries = Object.entries(timeUnit);
  for (let i = unitEntries.length - 1; i >= 0; i--) {
    const value = time / timeUnitInMillis[unitEntries[i][1]];
    if (value >= 1) {
      let str = value.toString();
      const dotIndex = str.indexOf(".");
      str = str.slice(0, dotIndex > 0 ? dotIndex + 3 : undefined);
      return str;
    }
  }
}

export function compareIgnoreCase(string1: string, string2: string): boolean {
  if (string1 === string2) return true;
  if (string1 == null || string2 == null) return false;
  return string1.toLowerCase() === string2.toLowerCase();
}

// {a:1, b:2, c:3} => {a:"a", b:"b", c:"c"}
export function getEnumFromObjectKeys<T extends string>(
  source: Record<T, any>
): Record<T, T> {
  const target: Record<string, string> = {};
  Object.keys(source).forEach((key) => (target[key] = key));
  return target as Record<T, T>;
}

export function base64Encode(text: string): string {
  const encodedWord = crypto.enc.Utf8.parse(text);
  const encoded = crypto.enc.Base64.stringify(encodedWord);
  return encoded;
}
export function base64Decode(encoded: string): string {
  const encodedWord = crypto.enc.Base64.parse(encoded);
  const decoded = crypto.enc.Utf8.stringify(encodedWord);
  return decoded;
}

export function GenerateUUIDV4(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function getUrlContentInBase64(
  url: string,
  axiosConfig?: AxiosRequestConfig
): Promise<{ type: string; data: string }> {
  const imageRes = await Axios.get(url, {
    ...axiosConfig,
    responseType: "arraybuffer",
  });
  const imageType = imageRes.headers["content-type"];
  const imageData = imageRes.data;
  return {
    type: imageType,
    data: Buffer.from(imageData, "binary").toString("base64"),
  };
}

export async function writeBase64ToFile(
  content: string,
  fileName: string
): Promise<void> {
  return promises.writeFile(fileName, Buffer.from(content, "base64"));
}

export function pickRandomly<T>(candidates: T[]): T {
  return candidates[Date.now() % (candidates.length || 1)];
}

export function assert(
  truthy: boolean,
  errorMessage: string = "Asset failed!",
  noThrow = false,
) {
  if (truthy) {
    return "";
  }
  if (noThrow) {
    return errorMessage;
  } else {
    throw Error(errorMessage);
  }
}

export class FixedSizeRecord<T> {
  private _record: Record<string, T> = {};
  private _keyArray: string[] = [];
  constructor(private _size: number) {
    assert(_size > 0, "size must be larger than 0.");
  }
  public set(key: string, value: T) {
    this._record[key] = value;
    if (!this._keyArray.includes(key)) {
      this._keyArray.push(key);
    }
    if (this._keyArray.length > this._size) {
      delete this._record[this._keyArray.shift()!];
    }
  }
  public get(key: string): T | undefined;
  public get(key: string, defaultValue: T): T;
  public get(key: string, defaultValue?: T): T | undefined {
    if (this._record[key] != null) {
      return this._record[key];
    } else if (defaultValue != null) {
      this.set(key, defaultValue);
      return defaultValue;
    }
  }
  public removeByKey(key: string) {
    delete this._record[key];
    this._keyArray = this._keyArray.filter((i) => i !== key);
  }
  public clear() {
    this._record = {};
    this._keyArray = [];
  }
  public keys() {
    return this._keyArray;
  }
  public values() {
    return this._keyArray.map((key) => this._record[key]);
  }
  public entries() {
    return Object.entries(this._record);
  }
  public length() {
    return this._keyArray.length;
  }
  public at(index: number) {
    return this._record[this._keyArray[index]];
  }
  public debug() {
    console.debug(this._keyArray);
    console.debug(this._record);
  }
}
