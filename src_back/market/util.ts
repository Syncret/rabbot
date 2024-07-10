export function string2ItemWithCountArray(text: string, separator?: string | RegExp, allowNegtive?: boolean, allowDecimal?: boolean): Array<[string, number, string]> {
    return text.split(/,|，|;|；/).filter((i) => i && i.trim()).map((i) => string2ItemWithCount(i, separator, allowNegtive, allowDecimal));
}

export function string2ItemWithCount(text: string, separator: string | RegExp = /X|x|\*|\//, allowNegtive = false, allowDecimal = false): [string, number, string] {
    const parsedTexts = text.trim().split(separator);
    let name: string = "";
    let count = 1;
    if (parsedTexts.length === 1) {
        name = parsedTexts[0];
    } else {
        count = Number(parsedTexts[1]);
        if (isNaN(count)) {
            count = Number(parsedTexts[0]);
            if (isNaN(count)) {
                throw `Can't parse ${text}.`;
            }
            name = parsedTexts[1];
        } else {
            name = parsedTexts[0];
        }
        if (!allowNegtive && count <= 0) {
            throw `Invalid count for ${name}.`;
        }
        if (!allowDecimal && count % 1 !== 0) {
            throw `Cannot be decimal for ${name}'s count.`;
        }
    }
    return [name, count, text];
}

export function limitNumberValue(value: number, min?: number, max?: number): number {
    if (min != null && value < min) {
        return min;
    }
    if (max != null && value > max) {
        return max;
    }
    return value;
}