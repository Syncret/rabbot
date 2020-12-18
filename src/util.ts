import Axios, { AxiosRequestConfig } from "axios";
import * as crypto from "crypto-js";

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
