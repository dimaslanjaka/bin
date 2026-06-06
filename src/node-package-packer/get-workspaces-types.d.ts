export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'unknown';

export type DependencyMap = Record<string, string>;

/**
 * Workspaces field from package.json.
 * Supports array format or object with `packages` array.
 */
export type WorkspacesConfig = string[] | { packages?: string[] };

export interface GetWorkspacesInfoOptions {
  absolutePaths?: boolean;
  includeScripts?: boolean;
  includeDependencies?: boolean;
  includeRootPackage?: boolean;
  /**
   * Use in-memory cache keyed by checksum of configuration files.
   * @default true
   */
  useCache?: boolean;
}

export interface WorkspacePackageInfo {
  name: string | null;
  version: string | null;
  private: boolean;

  /**
   * Relative workspace path from root.
   * Root package will use "." when includeRootPackage is true.
   */
  path: string;

  /**
   * package.json path.
   * Absolute when absolutePaths=true.
   * Relative when absolutePaths=false.
   */
  packageJsonPath: string;

  /**
   * Only available when absolutePaths=true.
   */
  absolutePath?: string;

  /**
   * Only included when includeScripts=true.
   */
  scripts?: Record<string, string>;

  /**
   * Only included when includeDependencies=true.
   */
  dependencies?: DependencyMap;
  devDependencies?: DependencyMap;
  peerDependencies?: DependencyMap;
  optionalDependencies?: DependencyMap;
}

export interface WorkspacesInfo {
  root: string;
  packageManager: PackageManager;
  workspacePatterns: string[];
  total: number;
  workspaces: WorkspacePackageInfo[];
}
