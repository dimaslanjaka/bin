export interface OpencodeKey {
  name: string;
  key: string;
}

export interface BinaryCollectionsConfig {
  // Base directory for temporary files
  tempDir?: string;

  // GitHub token for API access
  githubToken?: string;

  // Opencode API keys
  opencode?: {
    keys: OpencodeKey[];
  };

  // You can add other configuration options here as needed
}
