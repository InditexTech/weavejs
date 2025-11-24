import fs from 'fs/promises'

export const getFileContents = async (
  filePath: string,
  encoding: BufferEncoding = 'utf-8'
): Promise<string> => {
  try {
    const content = await fs.readFile(filePath, { encoding })
    return content
  } catch (err) {
    console.error(
      `Error reading file ${filePath}: ${
        err instanceof Error ? err.message : err
      }`
    )
    throw err
  }
}

export const existFile = async (filePath: string) => {
  try {
    const stats = await fs.stat(filePath)
    return stats.isFile()
  } catch (err) {
    console.error(
      `Error reading file ${filePath}: ${
        err instanceof Error ? err.message : err
      }`
    )
    return false
  }
}

export const existsFolder = async (folderPath: string) => {
  try {
    const stats = await fs.stat(folderPath)
    return stats.isDirectory()
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_) {
    return false
  }
}

export const createFolder = async (folderPath: string): Promise<void> => {
  await fs.mkdir(folderPath, { recursive: true })
}

export function isAbsoluteUrl(url: string): boolean {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(url)
}

export function stripOrigin(url: string): string {
  const parsedUrl = new URL(url)
  return parsedUrl.pathname + parsedUrl.search + parsedUrl.hash
}
