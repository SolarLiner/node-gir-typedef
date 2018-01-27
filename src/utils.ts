import { readFileSync, writeFileSync } from "fs";

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
    return lines.map(value => Array(depth).join('    ') + value);
}
/**
 * Returns the filename from an absolute or relative path.
 * 
 * @export
 * @param {string} path Absolute/Relative path
 * @returns {string} Base filename extracted from path
 */
export function basename(path: string): string {
    let lastDirSeparator = path.lastIndexOf('/') || path.lastIndexOf('\\');
    if(!lastDirSeparator) // Path doesn't contain directory separators, treat it as alreayd a basename
        return path;

    return path.substr(lastDirSeparator);
}
/**
 * Returns a promise that resolves with the content from the file
 * 
 * @export
 * @param {string} path Absolute or relative path to the file
 * @returns {Promise<string>} Promise that resolves with content, or rejects with error
 */
export async function readFile(path: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        try {
            let contents = readFileSync(path).toString();
            resolve(contents);
        } catch (error) {
            reject(error);
        }
    });
}
/**
 * Async writeFile function
 * 
 * @export
 * @param {string} path Absolute/Relative path to write to
 * @param {*} data Data to write in the file
 * @returns Promise that resolves when written, or rejects with an error.
 */
export async function writeFile(path: string, data: any) {
    return new Promise<void>((resolve, reject) => {
        try {
            writeFileSync(path, data);
            resolve();
        } catch(error) {
            reject(error);
        }
    });
}