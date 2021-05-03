import { parseCellDoorCode } from "./maze.util";

export namespace Room {

    type RoomType = "normal" | "trap" | "rest" | "shop" | "stair";
    enum roomDirection {
        up = "北",
        right = "东",
        down = "南",
        left = "西",
    }
    export const RoomDirection: Record<string, string> = roomDirection;

    type BaseRoom = {
        name: string,
        type: RoomType,
        displayName: string,
        probabilty: number,
        description: string,
        effect?: number,
        items: Record<string, number>
    }
    export const RoomRemainingItemsKey = "__ITEMGEN__"; // key for room remaining random items
    export const RoomRegistry: Record<string, BaseRoom> = {};
    export const RoomProbMap: Record<string, number> = {};
    export function getDoorDescription(doorCode: number): string {
        const door = parseCellDoorCode(doorCode);
        const gates = Object.entries(door).filter(([_, isOpen]) => isOpen).map(([direction]) => Room.RoomDirection[direction]);
        return `房间的${gates.join(", ")}边${gates.length > 1 ? "各" : ""}有一扇门。`;
    }

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

    export const BlankRoom: BaseRoom = {
        name: "blank",
        type: "normal",
        displayName: "空房间",
        probabilty: 100,
        description: "房间里空旷又安静，似乎没有什么特别的东西。",
        items: { [RoomRemainingItemsKey]: 10 }

    };
    export const SpringRoom: BaseRoom = {
        name: "spring",
        type: "rest",
        displayName: "泉水房间",
        probabilty: 10,
        effect: 10,
        description: "房间里氤氲着热腾腾的雾气。中间有一个水池，似乎是一个温泉的样子！",
        items: { [RoomRemainingItemsKey]: 10 }
    };
    export const FallTrapRoom: BaseRoom = {
        name: "fallTrap",
        type: "trap",
        displayName: "落穴房间",
        probabilty: 20,
        effect: 0.2,
        description: "房间中间有一个掩盖起来的陷阱。",
        items: { [RoomRemainingItemsKey]: 10 }
    };
    export const ShopRoom: BaseRoom = {
        name: "shop",
        type: "shop",
        displayName: "商店",
        probabilty: 10,
        description: "房间里有一个穿着兜帽，看不清面庞的怪人，似乎在兜售一些小玩意。",
        items: { [RoomRemainingItemsKey]: 10 }
    };
    export const StairRoom: BaseRoom = {
        name: "stair",
        type: "stair",
        displayName: "阶梯",
        probabilty: 0,
        description: "房间里有一扇巨大的门，背后似乎通向迷宫的下一层。",
        items: { [RoomRemainingItemsKey]: 5 }
    };

    [BlankRoom, SpringRoom, FallTrapRoom, ShopRoom, StairRoom].forEach((room) => {
        registerRoom(room);
    })

}