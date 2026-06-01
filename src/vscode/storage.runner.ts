import {
  APP_DATA_DIR,
  USER_DIR,
  SETTINGS_PATH,
  KEYBINDINGS_PATH,
  SNIPPETS_DIR,
  WORKSPACE_STORAGE_DIR,
  GLOBAL_STORAGE_DIR,
  HISTORY_DIR,
  SYNC_DIR,
  EXTENSIONS_DIR,
  CACHE_DIR,
  CACHED_DATA_DIR,
  CACHED_EXTENSIONS_DIR,
  CACHED_VSIXS_DIR,
  LOGS_DIR,
  DATABASE_PATH,
  MACHINE_ID_PATH,
  listWorkspaceProjects
} from './storage.js';

async function main(): Promise<void> {
  console.log(`APP_DATA_DIR:            ${APP_DATA_DIR}`);
  console.log(`USER_DIR:                ${USER_DIR}`);
  console.log(`SETTINGS_PATH:           ${SETTINGS_PATH}`);
  console.log(`KEYBINDINGS_PATH:        ${KEYBINDINGS_PATH}`);
  console.log(`SNIPPETS_DIR:            ${SNIPPETS_DIR}`);
  console.log(`WORKSPACE_STORAGE_DIR:   ${WORKSPACE_STORAGE_DIR}`);
  console.log(`GLOBAL_STORAGE_DIR:      ${GLOBAL_STORAGE_DIR}`);
  console.log(`HISTORY_DIR:             ${HISTORY_DIR}`);
  console.log(`SYNC_DIR:                ${SYNC_DIR}`);
  console.log(`EXTENSIONS_DIR:          ${EXTENSIONS_DIR}`);
  console.log(`CACHE_DIR:               ${CACHE_DIR}`);
  console.log(`CACHED_DATA_DIR:         ${CACHED_DATA_DIR}`);
  console.log(`CACHED_EXTENSIONS_DIR:   ${CACHED_EXTENSIONS_DIR}`);
  console.log(`CACHED_VSIXS_DIR:        ${CACHED_VSIXS_DIR}`);
  console.log(`LOGS_DIR:                ${LOGS_DIR}`);
  console.log(`DATABASE_PATH:           ${DATABASE_PATH}`);
  console.log(`MACHINE_ID_PATH:         ${MACHINE_ID_PATH}`);

  console.log('\n--- Workspace Projects ---');
  const projects = await listWorkspaceProjects();
  console.log(`Total: ${projects.length}`);

  console.log('\nWorkspaces with Copilot memory directory:');
  const copilotProjects = projects.filter((p) => p.copilotMemoryDir);
  for (const p of copilotProjects) {
    console.log(`  ${p.storageId.slice(0, 8)}  ${p.folder}`);
    console.log(`    storagePath: ${p.storagePath}`);
    console.log(`    copilotMemoryDir: ${p.copilotMemoryDir}`);
  }

  if (copilotProjects.length === 0) {
    console.log('  (no workspaces with Copilot memory dir)');
  }
}

main();
