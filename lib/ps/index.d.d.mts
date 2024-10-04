interface Program {
  arguments: string[];
  command: string;
  pid: number;
}

interface Query {
  pid?: string | string[] | number | undefined;
  ppid?: number | undefined;
  command?: string | RegExp | undefined;
  arguments?: string | RegExp | undefined;
  psargs?: string | string[] | undefined;
}

interface Signal {
  signal: string;
  timeout: number;
}

/** Query Process: Focus on pid & cmd */
declare function lookup(query: Query, cb: (err: Error, list: Program[]) => void): void;

declare function kill(pID: number | string, cb?: (err?: Error) => void): void;
declare function kill(pID: number | string, signal?: string | Signal, cb?: (err?: Error) => void): void;

export { type Program, type Query, type Signal, kill, lookup };
