import { Random } from "koishi-utils";

function generateMaze<T extends string>(width: number, height: number, ringProb: number = 0, roomProb?: Record<T, number>) {
    if (width < 2 || height < 2) {
        throw Error("Height and width must be greater than 2");
    }
    if (width % 2 === 0) width++;
    if (height % 2 === 0) height++;
    // initialize the maze
    // -1: determined wall, 0: undetermined wall, 1: unconnected land, 2: connected land
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
            .forEach((c) => maze[c] === 0 && blues.add(c));
    }
    markNewCube(start);
    let redCount = 1;
    const maxReds = Math.floor(width / 2) * Math.floor(height / 2);
    while (blues.size > 0) {
        const blue = Random.pick(Array.from(blues));
        blues.delete(blue);
        let redCan = blue % width % 2 === 0 ? [blue - 1, blue + 1] : [blue - width, blue + width];
        redCan = redCan.filter((r) => maze[r] === 1);
        if (redCan.length === 0) {
            maze[blue] = Math.random() > ringProb ? -1 : 1;
        } else {
            maze[blue] = 1;
            markNewCube(redCan[0]);
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

function printMaze<T extends string | number>(maze: (T | undefined)[], width: number, wallChar = "*") {
    const maze2 = maze.map((cube, index) => {
        const char = typeof cube === "number" ? cube > 0 ? "十" : cube === 0 ? "口" : "口" : cube;
        return (index + 1) % width === 0 ? char + "\n" : char;
    }).join("");
    console.log(maze2);
}

function test() {
    const [width, height] = [16, 16];
    const maze = generateMaze(width, height, 0, { "泉": 10, "房": 50, "陷": 10 })
    printMaze(maze, width + 1);
}

test();