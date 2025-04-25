import { promises as fs } from 'fs';
import path from 'path';
import { Logger } from 'pino';
import { getLogger } from '../logger/logger.js';
import { createFolder, existsFolder, getFileContents } from '@/utils.js';

const IMAGES_FOLDER = './images';
const IMAGES_MIME_TYPE_FOLDER = './images-mimetype';

export class ImagesPersistenceHandler {
  private _initialized!: boolean;
  private _logger!: Logger;

  constructor() {
    this._initialized = false;
    this._logger = getLogger().child({ module: 'images.persistence' });
  }

  isInitialized() {
    return this._initialized;
  }

  async setup() {
    const folderPath = path.join(process.cwd(), IMAGES_FOLDER);

    if (!(await existsFolder(folderPath))) {
      await createFolder(folderPath);
    }

    const folderMimeTypePath = path.join(
      process.cwd(),
      IMAGES_MIME_TYPE_FOLDER,
    );

    if (!(await existsFolder(folderMimeTypePath))) {
      await createFolder(folderMimeTypePath);
    }

    this._initialized = true;
  }

  async list(prefix: string, pageSize: number = 20, page: number = 1) {
    try {
      if (!this._initialized) {
        await this.setup();
      }

      const folder = path.join(process.cwd(), IMAGES_FOLDER, prefix);

      if (!(await existsFolder(folder))) {
        await createFolder(folder);
      }

      const files = await fs.readdir(folder);
      const totalFiles = files.length;
      const totalPages = Math.ceil(totalFiles / pageSize);
      const start = (page - 1) * pageSize;
      const end = start + pageSize;

      const paginatedFiles = files.slice(start, end);

      return { images: paginatedFiles, totalPages, nextPage: page + 1 };
    } catch (ex) {
      this._logger.error({ error: ex }, 'Error getting images list');
      return { images: [], continuationToken: undefined };
    }
  }

  async exists(imageName: string) {
    try {
      if (!this._initialized) {
        await this.setup();
      }

      try {
        const filePath = path.join(process.cwd(), IMAGES_FOLDER, imageName);

        await fs.access(filePath);

        return true;
      } catch (err) {
        this._logger.error(
          { imageName, error: err },
          'File does not exist or is not accessible',
        );
        return false;
      }
    } catch (ex) {
      this._logger.error(
        { imageName, error: ex },
        'Error checking if image exists',
      );
      return false;
    }
  }

  async createRoomFolder(imageName: string) {
    const imageTokens = imageName.split('/');
    const roomFolder = imageTokens[0];
    const roomFolderPath = path.join(process.cwd(), IMAGES_FOLDER, roomFolder);

    if (!(await existsFolder(roomFolderPath))) {
      await createFolder(roomFolderPath);
    }
  }

  async createRoomMimeTypeFolder(imageName: string) {
    const imageTokens = imageName.split('/');
    const roomFolder = imageTokens[0];
    const roomMimeTypeFolderPath = path.join(
      process.cwd(),
      IMAGES_MIME_TYPE_FOLDER,
      roomFolder,
    );

    if (!(await existsFolder(roomMimeTypeFolderPath))) {
      await createFolder(roomMimeTypeFolderPath);
    }
  }

  async getMimeType(imageName: string) {
    try {
      if (!this._initialized) {
        await this.setup();
      }

      await this.createRoomMimeTypeFolder(imageName);

      const filePath = path.join(
        process.cwd(),
        IMAGES_MIME_TYPE_FOLDER,
        imageName,
      );
      const filePathMimeType = `${filePath}.mimeType`;

      return await getFileContents(filePathMimeType);
    } catch (ex) {
      this._logger.error(
        { imageName, error: ex },
        'Error getting image MIME type',
      );
      return 'application/octet-stream';
    }
  }

  async persist(
    imageName: string,
    mimeType: string,
    content: Uint8Array,
  ): Promise<boolean> {
    try {
      if (!this._initialized) {
        await this.setup();
      }

      this._logger.debug({ imageName }, 'Persisting image');

      await this.createRoomFolder(imageName);
      await this.createRoomMimeTypeFolder(imageName);

      const filePath = path.join(process.cwd(), IMAGES_FOLDER, imageName);
      const fileMimeTypePath = path.join(
        process.cwd(),
        IMAGES_MIME_TYPE_FOLDER,
        imageName,
      );
      const filePathMimeType = `${fileMimeTypePath}.mimeType`;

      try {
        await fs.writeFile(filePathMimeType, mimeType, { encoding: 'utf-8' });
        await fs.writeFile(filePath, content);

        this._logger.debug({ imageName }, 'Persisted image');

        return true;
      } catch (err) {
        console.log(err);
        this._logger.error({ imageName, error: err }, 'Error saving the image');
        return false;
      }
    } catch (ex) {
      this._logger.error({ imageName, error: ex }, 'Error persisting image');
      return false;
    }
  }

  async delete(imageName: string): Promise<boolean> {
    try {
      if (!this._initialized) {
        await this.setup();
      }

      try {
        this._logger.debug({ imageName }, 'Deleting image');

        await this.createRoomFolder(imageName);
        await this.createRoomMimeTypeFolder(imageName);

        const filePath = path.join(process.cwd(), IMAGES_FOLDER, imageName);
        const fileMimeTypePath = path.join(
          process.cwd(),
          IMAGES_MIME_TYPE_FOLDER,
          imageName,
        );
        const filePathMimeType = `${fileMimeTypePath}.mimeType`;

        if (!(await this.exists(imageName))) {
          this._logger.debug({ imageName }, 'Image not found');
          return false;
        }

        await fs.unlink(filePath);
        await fs.unlink(filePathMimeType);

        this._logger.debug({ imageName }, 'Deleted image');

        return true;
      } catch (err) {
        this._logger.error(
          { imageName, error: err },
          'Error deleting the file',
        );
        return false;
      }
    } catch (ex) {
      this._logger.error({ imageName, error: ex }, 'Error deleting the image');
      return false;
    }
  }

  async getFilePath(imageName: string): Promise<string> {
    if (!this._initialized) {
      await this.setup();
    }

    const filePath = path.join(process.cwd(), IMAGES_FOLDER, imageName);

    return filePath;
  }
}
