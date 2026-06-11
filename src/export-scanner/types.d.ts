/** A parsed export entry from a source file */
export interface ExportEntry {
  name: string;
  type: string;
  exportType: 'named' | 'default' | 're-export' | 'namespace-re-export';
  source: string | null;
}
