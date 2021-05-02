import { Random } from "koishi-utils";

function generateRawMaze<T extends string>(width: number, height: number, ringProb: number = 0, roomProb?: Record<T, number>) {
    if (width < 2 || height < 2) {
        throw Error("Height and width must be greater than 2");
    }
    width = width * 2 + 1;
    height = height * 2 + 1;
    // initialize the maze
    // -1: determined wall
    // 0: undetermined wall, can be turned into road
    // 1: unconnected land
    // 2: connected land
    let maze: number[] = [];
    const initWall = (i: number, size: number) => (i === 0 || (i % 2 === 0 && i === size - 1)) ? -1 : 0;
    for (let i = 0; i < height; i++) {
        const curLine: number[] = new Array(width);
        if (i % 2 === 0) {
            curLine.fill(initWall(i, height));
            maze.push(...curLine);
        } else {
            for (let j = 0; j < width; j++) {
                curLine[j] = j % 2 === 0 ? initWall(j, width) : 1;
            }
            maze.push(...curLine);
        }
    }
    const start = width + 1;
    const blues = new Set<number>();
    const markNewCube = (red: number) => {
        maze[red] = 2;
        [red - 1, red + 1, red - width, red + width]
            .forEach((c) => maze[c] === 0 && blues.add(c)); // mark surrounding unmarked wall into blue
    }
    markNewCube(start);
    let redCount = 1;
    const maxReds = Math.floor(width / 2) * Math.floor(height / 2);
    while (blues.size > 0) {
        const blue = Random.pick(Array.from(blues));
        blues.delete(blue);
        let redCan = blue % width % 2 === 0 ? [blue - 1, blue + 1] : [blue - width, blue + width];
        redCan = redCan.filter((r) => maze[r] === 1); // filter the unconnected cube from candidates
        if (redCan.length === 0) { // all candidates connected
            maze[blue] = Math.random() > ringProb ? -1 : 2; // create a joint cube if ring prob set
        } else {
            maze[blue] = 2; // set blue to 2 (connected land)
            markNewCube(redCan[0]); // set candidate to red and mark surroundings to blue
            redCount++;
            if (redCount >= maxReds) {
                break;
            }
        }
    }
    if (roomProb) {
        const maze2 = maze.map((c) => c === 2 ? Random.weightedPick(roomProb) : c);
        return maze2
    }
    return maze;
}

export function generateMaze(width: number, height: number, ringProb: number = 0.05,): number[] {
    const rawMaze = generateRawMaze(width, height, ringProb);
    printMaze(rawMaze, width * 2 + 1);
    const maze: number[] = [];
    const rawWidth = 2 * width + 1;
    const rawHeight = 2 * height + 1;
    for (let i = 0; i < width * height; i++) {
        const y = 2 * (Math.floor(i / width)) + 1;
        const x = 2 * (i % width) + 1;
        const up = (y - 1) * rawWidth + x;
        const down = (y + 1) * rawWidth + x;
        const left = y * rawWidth + x - 1;
        const right = y * rawWidth + x + 1;
        maze[i] = getCellDoorCode({
            left: rawMaze[left] > 0,
            right: rawMaze[right] > 0,
            up: rawMaze[up] > 0,
            down: rawMaze[down] > 0
        });
    }
    const maze2 = maze.map((cube, index) => {
        const char = cube.toString().padStart(3," ");
        return (index + 1) % width === 0 ? char + "\n" : char;
    }).join("");
    console.log(maze2);
    return maze;
}

const DoorCode = {
    up: 0x1,
    right: 0x2,
    down: 0x4,
    left: 0x8,
}
type IDoor = Record<keyof typeof DoorCode, boolean>;

function getCellDoorCode(door: IDoor) {
    const { left, right, up, down } = door;
    let code = 0;
    left && (code |= DoorCode.left);
    right && (code |= DoorCode.right);
    up && (code |= DoorCode.up);
    down && (code |= DoorCode.down);
    return code;
}
function parseCellDoorCode(code: number): IDoor {
    return {
        left: !!(code & DoorCode.left),
        right: !!(code & DoorCode.right),
        up: !!(code & DoorCode.up),
        down: !!(code & DoorCode.down),
    }
}

function printMaze<T extends string | number>(maze: (T)[], width: number) {
    const cubeCharMap: Record<string | number, string> = {
        [-1]: "口",
        [0]: "口",
        [1]: "一",
        [2]: "  ",
    }
    const maze2 = maze.map((cube, index) => {
        const char = cubeCharMap[cube] || cube + "";
        return (index + 1) % width === 0 ? char + "\n" : char;
    }).join("");
    console.log(maze2);
}

function test() {
    const [width, height] = [8, 8];
    // const maze = generateRawMaze(width, height, 0.01)
    // printMaze(maze, width * 2 + 1);
    // const code = getCellDoorCode({ left: true, right: true, up: false, down: false });
    // console.log(code);
    // console.log(parseCellDoorCode(code));
    const maze=generateMaze(width, height);
}

test();