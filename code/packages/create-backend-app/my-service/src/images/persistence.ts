import { promises as fs } from 'fs';
import path from 'path';
import { Logger } from 'pino';
import { getLogger } from '../logger/logger.js';

const IMAGES_FOLDER = './images';

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
    this._initialized = true;
  }

  async list(prefix: string, pageSize: number = 20, page: number = 1) {
    try {
      if (!this._initialized) {
        await this.setup();
      }

      const folder = path.join(process.cwd(), IMAGES_FOLDER, prefix);

      const files = await fs.readdir(folder);
      const totalFiles = files.length;
      const totalPages = Math.ceil(totalFiles / pageSize);
      const start = (page - 1) * pageSize;
      const end = start + pageSize;

      const paginatedFiles = files.slice(start, end);

      const images: string[] = [];
      for (const item of paginatedFiles) {
        images.push(item.split('/')[1]);
      }

      return { images, totalPages, nextPage: page + 1 };
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

  async persist(imageName: string, content: Uint8Array): Promise<boolean> {
    try {
      if (!this._initialized) {
        await this.setup();
      }

      this._logger.debug({ imageName }, 'Persisting image');

      const filePath = path.join(process.cwd(), IMAGES_FOLDER, imageName);

      try {
        await fs.writeFile(filePath, content);

        this._logger.debug({ imageName }, 'Persisted image');

        return true;
      } catch (err) {
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

        const filePath = path.join(process.cwd(), IMAGES_FOLDER, imageName);

        if (!(await this.exists(imageName))) {
          this._logger.debug({ imageName }, 'Image not found');
          return false;
        }

        await fs.unlink(filePath);

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
