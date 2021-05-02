type RoomType = "normal" | "trap" | "rest" | "shop";

type BaseRoom = {
    name: string,
    type: RoomType,
    displayName: string,
    probabilty: number,
    description: string,
    effect?: number,
}

export const RoomRegistry: Record<string, BaseRoom> = {};
export const RoomProbMap: Record<string, number> = {};

function registerRoom(room: BaseRoom) {
    if (RoomRegistry[room.name]) {
        throw Error("Duplicate room key: " + room.name);
    }
    RoomRegistry[room.name] = room;
    if (room.probabilty > 0) {
        RoomProbMap[room.name] = room.probabilty;
    }
    return room;
}

const BlankRoom: BaseRoom = {
    name: "blank",
    type: "normal",
    displayName: "空房间",
    probabilty: 100,
    description: "房间里似乎什么也没有，寂静得可以听到自己的心跳声。"
};
const SpringRoom: BaseRoom = {
    name: "spring",
    type: "rest",
    displayName: "泉水房间",
    probabilty: 10,
    effect: 10,
    description: "房间里有一个水池，不停地冒着热气，似乎是一个温泉的样子！整个房间都氤氲着热腾腾的蒸汽。"
};
const FallTrapRoom: BaseRoom = {
    name: "fallTrap",
    type: "trap",
    displayName: "落穴房间",
    probabilty: 20,
    effect: 0.2,
    description: "房间中间有一个掩盖起来的陷阱。"
};
const ShopRoom: BaseRoom = {
    name: "shop",
    type: "shop",
    displayName: "商店",
    probabilty: 10,
    description: "房间里有一个穿着兜帽，看不清面庞的怪人，似乎在兜售一些小玩意。"
};

[BlankRoom, SpringRoom, FallTrapRoom, ShopRoom].forEach((room) => {
    registerRoom(room);
})