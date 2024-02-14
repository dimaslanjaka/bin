/**
 * delete file recursive
 * @param {string} fullPath
 */
export function del(fullPath: string): void;
/**
 * glob stream handler
 * @param {glob.Glob} globStream
 */
export function delStream(globStream: glob.Glob): void;
export function getArgs(): import("minimist").ParsedArgs;
/**
 * async delayed
 * @param {number} ms
 */
export function delay(ms: number): Promise<any>;
