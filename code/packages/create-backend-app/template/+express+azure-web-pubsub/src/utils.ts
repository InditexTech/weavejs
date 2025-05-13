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
      `Error reading file ${filePath}: ${err instanceof Error ? err.message : err}`
    )
    throw err
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
