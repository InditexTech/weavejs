import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";

// eslint-disable-next-line @typescript-eslint/naming-convention
const __filename = fileURLToPath(import.meta.url);
// eslint-disable-next-line @typescript-eslint/naming-convention
const __dirname = path.dirname(__filename);

export const getRoomStateFromFile = async (filename: string): Promise<Uint8Array | null> => {
  const roomsFolder = path.join(__dirname, "rooms");

  try {
    return await fs.readFile(path.join(roomsFolder, filename));
  } catch (error) {
    return null;
  }
};

export const persistRoomStateToFile = async (filename: string, data: Uint8Array) => {
  const roomsFolder = path.join(__dirname, "rooms");

  let folderExists = false;
  try {
    await fs.access(roomsFolder);
    folderExists = true;
  } catch (error) {
    folderExists = false;
  }

  if (!folderExists) {
    await fs.mkdir(roomsFolder, { recursive: true });
  }

  await fs.writeFile(path.join(roomsFolder, filename), data);
};
