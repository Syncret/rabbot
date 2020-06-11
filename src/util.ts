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
  let match: RegExpExecArray;
  let x: number;
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

function test(): void {
  const a = String2TimeInterval("189h");
  console.log(a);
  const b = TimeInterval2String(a);
  console.log(b);
  const c = new Date();
  const d = new Date(c.getTime() + a);
  console.log(d);
}
