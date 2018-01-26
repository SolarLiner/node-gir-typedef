import { readFileSync } from "fs";

export function isNameValid(word: string): boolean {
    try {
        eval(`let ${word} = 1`);
        return true;
    } catch {
        return false;
    }
}

/**
 * Indent a set of lines by the specified depth (amount of 4-spaced soft tabs).
 * 
 * @export
 * @param {string[]} lines Input lines
 * @param {number} depth Depth of the indent (as number of 4-spaced soft tabs)
 * @returns Array of indented lines
 */
export function indent(lines: string[], depth: number) {
    return lines.map(value => Array(depth).join('    '));
}

export function readFile(path: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        try {
            let contents = readFileSync(path).toString();
            resolve(contents);
        } catch (error) {
            reject(error);
        }
    });
}