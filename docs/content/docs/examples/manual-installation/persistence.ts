import path from "path"; // (1)
import fs from "fs/promises"; // (1)

export const fetchRoom = async (docName: string) => {
  try {
    const roomsFolder = path.join(__dirname, "rooms");
    const roomsFile = path.join(roomsFolder, docName);
    return await fs.readFile(roomsFile);
  } catch (e) {
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
    } catch (e) {
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
