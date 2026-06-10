export interface KeyData {
  name: string;
  key: string;
}

export interface BinaryCollectionsConfig {
  /** Base directory for temporary files */
  tempDir?: string;

  /** GitHub token for API access */
  githubToken?: string;

  /** Resolutions normalization mappings for node-package-packer */
  normalizeResolutions?: Array<{ pkg: string; to: string }>;

  /** Opencode API keys */
  opencode?: {
    keys: KeyData[];
  };

  /** NVIDIA API keys */
  nvidia?: {
    keys: KeyData[];
  };

  /** package packer options */
  packer?: {
    /** Filter tarball entries during cleanup. Return false to exclude an entry. */
    onFilter?: (entryPath: string) => boolean | Promise<boolean>;
    /** Callback invoked after tarball cleanup finishes. */
    onFinish?: (tarballPath: string) => any | Promise<any>;
  };
}
