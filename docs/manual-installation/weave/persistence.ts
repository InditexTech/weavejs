import path from "path"; // (1)
import fs from "fs/promises"; // (1)
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const fetchRoom = async (docName: string) => {
  try {
    const roomsFolder = path.join(__dirname, "rooms");
    const roomsFile = path.join(roomsFolder, docName);

    const roomsFileCheck = path.resolve(roomsFolder, docName);
    if (!roomsFileCheck.startsWith(path.resolve(roomsFolder))) {
      throw new Error("Path escape detected");
    }

    return await fs.readFile(roomsFile);
  } catch (e) {
    console.error(e);
    return null;
  }
}; // (2)

export const persistRoom = async (
  docName: string,
  actualState: Uint8Array<ArrayBufferLike>
) => {
  try {
    const roomsFolder = path.join(__dirname, "rooms");

    let folderExists = false;
    try {
      await fs.access(roomsFolder);
      folderExists = true;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch {
      folderExists = false;
    }

    if (!folderExists) {
      await fs.mkdir(roomsFolder, { recursive: true });
    }

    const roomsFile = path.join(roomsFolder, docName);
    await fs.writeFile(roomsFile, actualState);
  } catch (ex) {
    console.error(ex);
  }
}; // (3)
