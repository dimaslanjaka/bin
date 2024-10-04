import * as minimist from 'minimist';

/**
 * delete file recursive
 * @param {string} fullPath
 */
declare function del(fullPath: string): void;
/**
 * glob stream handler
 * @param {glob.Glob} globStream
 */
declare function delStream(globStream: glob.Glob): void;
declare function getArgs(): minimist.ParsedArgs;
/**
 * async delayed
 * @param {number} ms
 */
declare function delay(ms: number): Promise<any>;

export { del, delStream, delay, getArgs };
