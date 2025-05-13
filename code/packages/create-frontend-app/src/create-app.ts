import path from 'node:path';
import fs from 'node:fs/promises';
import { tryGitInit } from '@/git';
import { versions as localVersions } from '@/versions';
import versionPkg from './../template/package.json';
import type { PackageManager } from './auto-install';
import { autoInstall } from './auto-install';
import { cwd, sourceDir } from './constants';

export type Template = '+nextjs+websockets' | '+nextjs+azure-web-pubsub';

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
  if (options.template === '+nextjs+azure-web-pubsub') {
    const dependencies = {
      ...pick(versionPkg.dependencies, [
        '@hookform/resolvers',
        '@next/env',
        '@radix-ui/react-accordion',
        '@radix-ui/react-avatar',
        '@radix-ui/react-checkbox',
        '@radix-ui/react-dialog',
        '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-label',
        '@radix-ui/react-popover',
        '@radix-ui/react-scroll-area',
        '@radix-ui/react-select',
        '@radix-ui/react-slider',
        '@radix-ui/react-slot',
        '@radix-ui/react-tabs',
        '@radix-ui/react-tooltip',
        '@react-three/fiber',
        '@react-three/postprocessing',
        '@tanstack/react-query',
        'boring-avatars',
        'class-variance-authority',
        'clsx',
        'cmdk',
        'color',
        'framer-motion',
        'konva',
        'motion',
        'next',
        'next-themes',
        'ogl',
        'onnxruntime-web',
        'pdf-lib',
        'platform-detect',
        'postprocessing',
        'react',
        'react-dom',
        'react-hook-form',
        'react-number-format',
        'sharp',
        'sonner',
        'tailwind-merge',
        'tailwindcss-animate',
        'three',
        'uuid',
        'vaul',
        'zod',
        'zustand',
      ]),
      ...pick(localVersions, [
        '@inditextech/weave-react',
        '@inditextech/weave-sdk',
        '@inditextech/weave-store-azure-web-pubsub',
      ]),
    };

    const devDependencies = {
      ...pick(versionPkg.devDependencies, [
        '@eslint/eslintrc',
        '@tailwindcss/postcss',
        '@testing-library/dom',
        '@testing-library/react',
        '@types/node',
        '@types/react',
        '@types/react-dom',
        '@vitejs/plugin-react',
        'eslint',
        'eslint-config-next',
        'eslint-config-prettier',
        'jsdom',
        'lucide-react',
        'tailwindcss',
        'typescript',
        'vite-tsconfig-paths',
      ]),
    };

    return {
      name: projectName,
      version: '0.0.0',
      private: true,
      scripts: {
        build: 'next build',
        dev: 'next dev --experimental-https',
        lint: 'next lint',
        start: 'next start',
      },
      dependencies: sortObjectKeys(dependencies),
      devDependencies: sortObjectKeys(devDependencies),
    };
  }

  const dependencies = {
    ...pick(versionPkg.dependencies, [
      '@hookform/resolvers',
      '@next/env',
      '@radix-ui/react-accordion',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-label',
      '@radix-ui/react-popover',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-select',
      '@radix-ui/react-slider',
      '@radix-ui/react-slot',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
      '@react-three/fiber',
      '@react-three/postprocessing',
      '@tanstack/react-query',
      'boring-avatars',
      'class-variance-authority',
      'clsx',
      'cmdk',
      'color',
      'framer-motion',
      'konva',
      'motion',
      'next',
      'next-themes',
      'ogl',
      'onnxruntime-web',
      'pdf-lib',
      'platform-detect',
      'postprocessing',
      'react',
      'react-dom',
      'react-hook-form',
      'react-number-format',
      'sharp',
      'sonner',
      'tailwind-merge',
      'tailwindcss-animate',
      'three',
      'uuid',
      'vaul',
      'zod',
      'zustand',
    ]),
    ...pick(localVersions, [
      '@inditextech/weave-react',
      '@inditextech/weave-sdk',
      '@inditextech/weave-store-websockets',
    ]),
  };

  const devDependencies = {
    ...pick(versionPkg.devDependencies, [
      '@eslint/eslintrc',
      '@tailwindcss/postcss',
      '@testing-library/dom',
      '@testing-library/react',
      '@types/node',
      '@types/react',
      '@types/react-dom',
      '@vitejs/plugin-react',
      'eslint',
      'eslint-config-next',
      'eslint-config-prettier',
      'jsdom',
      'lucide-react',
      'tailwindcss',
      'typescript',
      'vite-tsconfig-paths',
    ]),
  };

  return {
    name: projectName,
    version: '0.0.0',
    private: true,
    scripts: {
      build: 'next build',
      dev: 'next dev --experimental-https',
      lint: 'next lint',
      start: 'next start',
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
