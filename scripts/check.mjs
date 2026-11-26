import {readdirSync} from 'node:fs';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {writeOfflineManifest} from './offline-manifest.mjs';

await writeOfflineManifest();
for (const directory of ['dist', 'api', 'scripts']) {
  for (const file of readdirSync(directory).filter(name => /\.(mjs|js)$/.test(name))) {
    const result = spawnSync(process.execPath, ['--check', join(directory, file)], {stdio: 'inherit'});
    if (result.status) process.exit(result.status);
  }
}
process.stdout.write('Application, API and server syntax checked; offline assets updated.\n');
