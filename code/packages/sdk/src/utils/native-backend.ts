// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

const MODULE_NOT_FOUND_CODES = ['ERR_MODULE_NOT_FOUND', 'MODULE_NOT_FOUND'];

const isMissingPackageError = (error: unknown, packageName: string) =>
  error instanceof Error &&
  MODULE_NOT_FOUND_CODES.includes(
    (error as NodeJS.ErrnoException).code ?? ''
  ) &&
  error.message.includes(`'${packageName}'`);

// The native packages are optional peer dependencies, npm doesn't warn when
// they are missing, so turn the raw module-not-found error into a clear one.
export const loadNativeBackend = async (
  packageName: string,
  setupFunctionName: string,
  load: () => Promise<unknown>
): Promise<void> => {
  try {
    await load();
  } catch (error) {
    if (isMissingPackageError(error, packageName)) {
      throw new Error(
        `${setupFunctionName}() requires the "${packageName}" package. Install it with \`npm install ${packageName}\`, using the version required by @inditextech/weave-sdk.`,
        { cause: error }
      );
    }
    throw error;
  }
};
