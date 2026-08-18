import { defineConfig } from '@vscode/test-cli';
import * as os from 'node:os';
import * as path from 'node:path';

// Keep the user-data dir out of the workspace. VS Code opens a Unix domain
// socket inside it, and macOS caps those paths at 103 chars — the default
// (<workspace>/.vscode-test/user-data) overflows on CI runners, which fail
// with `listen EINVAL: invalid argument .../1.13-main.sock`.
const userDataDir = path.join(os.tmpdir(), 'rcm-vscode-test');

export default defineConfig({
	files: 'out/test/**/*.test.js',
	launchArgs: [`--user-data-dir=${userDataDir}`],
});
