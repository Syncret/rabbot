export function string2ItemWithCountArray(text: string, allowNegtive = false, allowDecimal = false): Array<[string, number]> {
    return text.split(/,|，|;|；/).filter((i) => i && i.trim()).map((i) => string2ItemWithCount(i, allowNegtive, allowDecimal));
}

export function string2ItemWithCount(text: string, allowNegtive = false, allowDecimal = false): [string, number] {
    const parsedTexts = text.trim().split(/X|x|*/);
    const name = parsedTexts[0];
    let count = 1;
    if (parsedTexts[1]) {
        count = Number(parsedTexts[1]);
        if (isNaN(count)) {
            throw `Can't parse ${text}.`;
        }
        if (!allowNegtive && count <= 0) {
            throw `Invalid count for ${name}.`;
        }
        if (!allowDecimal && count % 1 !== 0) {
            throw `Cannot be decimal for ${name}'s count.`;
        }
    }
    return [name, count];
}