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

export function GenerateUUIDV4(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
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

export function formatString(msg: string, ...values: Array<string | number>): string {
  values.forEach((v, index) => {
      const reg = new RegExp(`\\{${index}\\}`, "g")
      msg = msg.replace(reg, v + "");
  });
  return msg;
}
