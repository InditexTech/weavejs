import path from 'node:path';
import fs from 'node:fs/promises';
import { tryGitInit } from '@/git';
import { versions as localVersions } from '@/versions';
import versionPkg from './../template/package.json';
import type { PackageManager } from './auto-install';
import { autoInstall } from './auto-install';
import { cwd, sourceDir } from './constants';

export type Template = '+express+websockets' | '+express+azure-web-pubsub';

export interface Options {
  outputDir: string;
  template: Template;
  packageManager: PackageManager;
  installDeps?: boolean;
  initializeGit?: boolean;
  log?: (message: string) => void;
}

export async function create(options: Options): Promise<void> {
  const {
    installDeps = true,
    initializeGit = true,
    log = console.log,
  } = options;
  const projectName = path.basename(options.outputDir);
  const dest = path.resolve(cwd, options.outputDir);

  function defaultRename(file: string): string {
    file = file.replace('example.gitignore', '.gitignore');
    file = file.replace('example.env', '.env');

    return file;
  }

  await copy(
    path.join(sourceDir, `template/${options.template}`),
    dest,
    defaultRename
  );

  // update tsconfig.json for src dir
  // if (isNext && options.useSrcDir) {
  const tsconfigPath = path.join(dest, 'tsconfig.json');
  const content = (await fs.readFile(tsconfigPath)).toString();

  const config = JSON.parse(content);

  if (config.compilerOptions?.paths) {
    Object.assign(config.compilerOptions.paths, {
      '@/*': ['./src/*'],
    });
  }

  await fs.writeFile(tsconfigPath, JSON.stringify(config, null, 2));
  // }

  const packageJson = createPackageJson(projectName, options);
  await fs.writeFile(
    path.join(dest, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  const readMe = await getReadme(dest, projectName);
  await fs.writeFile(path.join(dest, 'README.md'), readMe);

  if (installDeps) {
    await autoInstall(options.packageManager, dest);
    log('Installed dependencies');
  }

  if (initializeGit && tryGitInit(dest)) {
    log('Initialized Git repository');
  }
}

async function getReadme(dest: string, projectName: string): Promise<string> {
  const template = await fs
    .readFile(path.join(dest, 'README.md'))
    .then((res) => res.toString());

  return `# ${projectName}\n\n${template}`;
}

async function copy(
  from: string,
  to: string,
  rename: (s: string) => string = (s) => s
): Promise<void> {
  const stats = await fs.stat(from);

  if (stats.isDirectory()) {
    const files = await fs.readdir(from);

    await Promise.all(
      files.map((file) =>
        copy(path.join(from, file), rename(path.join(to, file)))
      )
    );
  } else {
    await fs.mkdir(path.dirname(to), { recursive: true });
    await fs.copyFile(from, to);
  }
}

function createPackageJson(projectName: string, options: Options): object {
  if (options.template === '+express+azure-web-pubsub') {
    const dependencies = {
      ...pick(localVersions, [
        '@inditextech/weave-sdk',
        '@inditextech/weave-store-azure-web-pubsub',
      ]),
      ...pick(versionPkg.dependencies, [
        '@dotenvx/dotenvx',
        '@imgly/background-removal-node',
        'cors',
        'dotenv',
        'express',
        'helmet',
        'morgan',
        'multer',
        'pino',
        'pino-http',
        'pino-pretty',
        'tslib',
        'tsx',
        'uuid',
        'zod',
      ]),
    };

    const devDependencies = {
      ...pick(versionPkg.devDependencies, [
        '@eslint/js',
        '@types/cors',
        '@types/express',
        '@types/morgan',
        '@types/multer',
        '@types/node',
        '@typescript-eslint/eslint-plugin',
        '@typescript-eslint/parser',
        'cp-cli',
        'eslint',
        'eslint-config-prettier',
        'globals',
        'nodemon',
        'prettier',
        'tsc-alias',
        'tsconfig-paths',
        'typescript',
        'typescript-eslint',
      ]),
    };

    return {
      name: projectName,
      type: 'module',
      scripts: {
        build:
          'tsc && tsc-alias -p tsconfig.json && mkdir -p ./dist/public && mkdir -p ./dist/temp && cp-cli ./public ./dist/public && cp-cli ./package.json ./dist/package.json',
        copyAssets:
          'mkdir -p ./public && cp-cli node_modules/@imgly/background-removal-node/dist/. public',
        dev: 'nodemon --exec "dotenvx run -- tsx src/server.ts"',
        format: 'prettier --write "src/**/*.{ts,tsx}"',
        lint: 'eslint ./src',
        postinstall: 'npm run copyAssets',
        start: 'dotenvx run -- tsx server.js',
      },
      private: true,
      dependencies: sortObjectKeys(dependencies),
      devDependencies: sortObjectKeys(devDependencies),
    };
  }

  const dependencies = {
    ...pick(versionPkg.dependencies, [
      '@dotenvx/dotenvx',
      '@imgly/background-removal-node',
      'cors',
      'dotenv',
      'express',
      'helmet',
      'morgan',
      'multer',
      'pino',
      'pino-http',
      'pino-pretty',
      'tslib',
      'tsx',
      'uuid',
      'zod',
    ]),
    ...pick(localVersions, [
      '@inditextech/weave-sdk',
      '@inditextech/weave-store-websockets',
    ]),
  };

  const devDependencies = {
    ...pick(versionPkg.devDependencies, [
      '@eslint/js',
      '@types/cors',
      '@types/express',
      '@types/morgan',
      '@types/multer',
      '@types/node',
      '@typescript-eslint/eslint-plugin',
      '@typescript-eslint/parser',
      'cp-cli',
      'eslint',
      'eslint-config-prettier',
      'globals',
      'nodemon',
      'prettier',
      'tsc-alias',
      'tsconfig-paths',
      'typescript',
      'typescript-eslint',
    ]),
  };

  return {
    name: projectName,
    version: '0.0.0',
    private: true,
    scripts: {
      build:
        'tsc && tsc-alias -p tsconfig.json && mkdir -p ./dist/public && mkdir -p ./dist/temp && cp-cli ./public ./dist/public && cp-cli ./package.json ./dist/package.json',
      copyAssets:
        'mkdir -p ./public && cp-cli node_modules/@imgly/background-removal-node/dist/. public',
      dev: 'nodemon --exec "dotenvx run -- tsx src/server.ts"',
      format: 'prettier --write "src/**/*.{ts,tsx}"',
      lint: 'eslint ./src',
      postinstall: 'npm run copyAssets',
      start: 'dotenvx run -- tsx server.js',
    },
    dependencies: sortObjectKeys(dependencies),
    devDependencies: sortObjectKeys(devDependencies),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sortObjectKeys<T extends Record<string, any>>(obj: T): T {
  const sortedEntries = Object.keys(obj)
    .sort()
    .map((key) => [key, obj[key]] as [keyof T, T[keyof T]]);

  return Object.fromEntries(sortedEntries) as T;
}

function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result: Partial<T> = {};

  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }

  return result as Pick<T, K>;
}
