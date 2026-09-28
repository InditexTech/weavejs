// SPDX-FileCopyrightText: 2026 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import path from 'node:path';
import fs from 'node:fs/promises';
import { tryGitInit } from '@/git';
import { versions as localVersions } from '@/versions';
import versionPkg from './../template/package.json' with { type: 'json' };
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
  const segments = options.outputDir.split(/[\\/]+/).filter(Boolean);
  for (const segment of segments) {
    if (segment === '..' || /^[A-Za-z]:$/.test(segment)) {
      throw new Error('The output directory cannot contain traversal or drive segments');
    }
  }
  const projectName = segments[segments.length - 1] ?? '';
  const dest = path.resolve(cwd, ...segments);

  function defaultRename(file: string): string {
    file = file.replace('example.gitignore', '.gitignore');
    file = file.replace('example.env', '.env');

    return file;
  }

  const copy = makeCopier(dest, defaultRename);

  await copy(
    path.join(sourceDir, `template/${options.template}`),
    dest
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

function makeCopier(
  root: string,
  rename: (s: string) => string = (s) => s
): (from: string, to: string) => Promise<void> {
  const copy = async (from: string, to: string): Promise<void> => {
    if (path.relative(root, to).startsWith('..')) {
      throw new Error('The output file must be inside the output directory');
    }
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
  };

  return copy;
}

function createPackageJson(projectName: string, options: Options): object {
  if (options.template === '+express+azure-web-pubsub') {
    const dependencies = {
      ...pick(localVersions, [
        '@inditextech/weave-sdk',
        '@inditextech/weave-store-azure-web-pubsub',
        '@inditextech/weave-store-standalone',
      ]),
      ...pick(versionPkg.dependencies, [
        '@dotenvx/dotenvx',
        '@imgly/background-removal-node',
        'archiver',
        'cors',
        'dotenv',
        'express',
        'helmet',
        'morgan',
        'multer',
        'p-queue',
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
        '@types/archiver',
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
        'make-dir-cli',
        'nodemon',
        'prettier',
        'tsc-alias',
        'tsconfig-paths',
        'typescript',
        'typescript-eslint',
      ]),
    };

    return {
      ...versionPkg,
      name: projectName,
      scripts: {
        build:
          'tsc && tsc-alias -p tsconfig.json && make-dir ./dist/public && make-dir ./dist/temp && cp-cli ./public ./dist/public && cp-cli ./package.json ./dist/package.json',
        ['copy:assets']:
          'make-dir ./public && cp-cli node_modules/@imgly/background-removal-node/dist/. public',
        ['copy:fonts']: 'cp-cli fonts/. dist/fonts',
        dev: 'nodemon',
        format: 'prettier --write "src/**/*.{ts,tsx}"',
        lint: 'eslint ./src',
        postinstall: 'npm run copy:assets',
        start:
          'node --experimental-specifier-resolution=node --loader --env-file=.env ts-node/esm dist/server.js',
        ['start:dev']:
          'cp-cli .env ./dist/.env && cd dist && NODE_ENV=development NODE_OPTIONS="--max-old-space-size=4096" node --env-file=.env ./server.js',
      },
      dependencies: sortObjectKeys(dependencies),
      devDependencies: sortObjectKeys(devDependencies),
    };
  }

  const dependencies = {
    ...pick(versionPkg.dependencies, [
      '@dotenvx/dotenvx',
      '@imgly/background-removal-node',
      'archiver',
      'cors',
      'dotenv',
      'express',
      'helmet',
      'morgan',
      'multer',
      'p-queue',
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
      '@inditextech/weave-store-standalone',
    ]),
  };

  const devDependencies = {
    ...pick(versionPkg.devDependencies, [
      '@eslint/js',
      '@types/archiver',
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
      'make-dir-cli',
      'nodemon',
      'prettier',
      'tsc-alias',
      'tsconfig-paths',
      'typescript',
      'typescript-eslint',
    ]),
  };

  return {
    ...versionPkg,
    name: projectName,
    scripts: {
      build:
        'tsc && tsc-alias -p tsconfig.json && make-dir ./dist/public && make-dir ./dist/temp && cp-cli ./public ./dist/public && cp-cli ./package.json ./dist/package.json',
      ['copy:assets']:
        'make-dir ./public && cp-cli node_modules/@imgly/background-removal-node/dist/. public',
      ['copy:fonts']: 'cp-cli fonts/. dist/fonts',
      dev: 'nodemon',
      format: 'prettier --write "src/**/*.{ts,tsx}"',
      lint: 'eslint ./src',
      postinstall: 'npm run copy:assets',
      start:
        'node --experimental-specifier-resolution=node --loader --env-file=.env ts-node/esm dist/server.js',
      ['start:dev']:
        'cp-cli .env ./dist/.env && cd dist && NODE_ENV=development NODE_OPTIONS="--max-old-space-size=4096" node --env-file=.env ./server.js',
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
