import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const {buildApplication} = require('./node_modules/@angular/build/src/builders/application/index.js');

const options = {
    outputPath: 'dist/simple-sport-probe',
    index: 'apps/simple-sport/src/index.html',
    browser: 'apps/simple-sport/src/main.ts',
    tsConfig: 'apps/simple-sport/tsconfig.app.json',
    assets: [
        {glob: '**/*', input: 'apps/simple-sport/public'},
        {glob: 'sql-wasm.wasm', input: 'node_modules/sql.js/dist', output: 'assets'},
    ],
    styles: ['apps/simple-sport/src/styles.css'],
    scripts: [],
    optimization: false,
    watch: false,
};

const context = {
    target: {project: 'simple-sport', target: 'build'},
    workspaceRoot: process.cwd(),
    cwd: process.cwd(),
    projectName: 'simple-sport',
    targetName: 'build',
    configurationName: 'development',
    options,
    logger: {
        lifecycle: {pipe: () => ({})},
        createdAt: Date.now(),
        log(level, message) {
            console.log(`[${level}] ${message}`);
        },
        info(m) {
            console.log(`[info] ${m}`);
        },
        warn(m) {
            console.warn(`[warn] ${m}`);
        },
        error(m) {
            console.error(`[error] ${m}`);
        },
        fatal(m) {
            console.error(`[fatal] ${m}`);
        },
    },
    addWarning(w) {
        console.warn('WARNING:', w);
    },
    addError(e) {
        console.error('ERROR:', e);
    },
    getProjectMetadata: async () => ({}),
    addTeardown: () => {},
    getCurrentTarget: () => 'simple-sport:build',
};

(async () => {
    try {
        for await (const output of buildApplication(options, context)) {
            console.log(
                'RESULT:',
                JSON.stringify({success: output.success, error: String(output.error ?? '')}, null, 2),
            );
            if (!output.success) process.exitCode = 1;
        }
    } catch (err) {
        console.error('EXECUTOR THREW:', err);
        process.exitCode = 1;
    }
})();
