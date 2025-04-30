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
    return {
      name: projectName,
      type: 'module',
      scripts: {
        build:
          'tsc && mkdir -p ./dist/public && mkdir -p ./dist/temp && cp -r ./public ./dist',
        copyAssets:
          'mkdir -p ./public && cp -r node_modules/@imgly/background-removal-node/dist/. public',
        dev: 'nodemon --exec "tsx --env-file=.env src/server.ts"',
        postinstall: 'npm run copyAssets',
        start:
          'node --experimental-specifier-resolution=node --env-file=.env --loader ts-node/esm dist/server.js',
      },
      private: true,
      dependencies: {
        ...pick(localVersions, [
          '@inditextech/weave-sdk',
          '@inditextech/weave-store-azure-web-pubsub',
        ]),
        ...pick(versionPkg.dependencies, [
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
          'ts-node',
          'uuid',
          'zod',
        ]),
      },
      devDependencies: pick(versionPkg.devDependencies, [
        '@eslint/js',
        '@types/cors',
        '@types/express',
        '@types/helmet',
        '@types/morgan',
        '@types/multer',
        '@types/node',
        '@typescript-eslint/eslint-plugin',
        '@typescript-eslint/parser',
        'eslint',
        'globals',
        'nodemon',
        'prettier',
        'prettier-eslint',
        'tsconfig-paths',
        'tsx',
        'typescript',
        'typescript-eslint',
      ]),
    };
  }

  return {
    name: projectName,
    version: '0.0.0',
    private: true,
    scripts: {
      build:
        'tsc && mkdir -p ./dist/public && mkdir -p ./dist/temp && cp -r ./public ./dist',
      copyAssets:
        'mkdir -p ./public && cp -r node_modules/@imgly/background-removal-node/dist/. public',
      dev: 'nodemon --exec "tsx --env-file=.env src/server.ts"',
      postinstall: 'npm run copyAssets',
      start:
        'node --experimental-specifier-resolution=node --env-file=.env --loader ts-node/esm dist/server.js',
    },
    dependencies: {
      ...pick(versionPkg.dependencies, [
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
        'ts-node',
        'uuid',
        'zod',
      ]),
      ...pick(localVersions, [
        '@inditextech/weave-sdk',
        '@inditextech/weave-store-websockets',
      ]),
    },
    devDependencies: {
      ...pick(versionPkg.devDependencies, [
        '@eslint/js',
        '@types/cors',
        '@types/express',
        '@types/helmet',
        '@types/morgan',
        '@types/multer',
        '@types/node',
        '@typescript-eslint/eslint-plugin',
        '@typescript-eslint/parser',
        'eslint',
        'globals',
        'nodemon',
        'prettier',
        'prettier-eslint',
        'tsconfig-paths',
        'tsx',
        'typescript',
        'typescript-eslint',
      ]),
    },
  };
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
