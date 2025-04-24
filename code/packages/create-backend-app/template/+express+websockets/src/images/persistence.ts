import { Logger } from "pino";
import { BlobDownloadResponseParsed, BlobServiceClient, ContainerClient, ContainerListBlobsOptions } from "@azure/storage-blob";
import { getServiceConfig } from "../config/config.js";
import { getLogger } from "../logger/logger.js";

export class ImagesPersistenceHandler {
  private _blobServiceClient!: BlobServiceClient;
  private _containerClient!: ContainerClient;
  private _initialized!: boolean;
  private _logger!: Logger;

  constructor() {
    this._initialized = false;
    this._logger = getLogger().child({ module: "images.persistence" });
  }

  isInitialized() {
    return this._initialized;
  }

  async setup() {
    const config = getServiceConfig();

    const {
      storage: {
        connectionString,
        images: { containerName },
      },
    } = config;

    this._blobServiceClient =
      BlobServiceClient.fromConnectionString(connectionString);

    this._containerClient =
      this._blobServiceClient.getContainerClient(containerName);
    if (!(await this._containerClient.exists())) {
      this._containerClient = (
        await this._blobServiceClient.createContainer(containerName)
      ).containerClient;
    }

    this._initialized = true;
  }

  async list(prefix: string, pageSize: number = 20, continuationToken: string | undefined = undefined) {
    try {
      if (!this._initialized) {
        await this.setup();
      }
      const listOptions: ContainerListBlobsOptions = {
        includeMetadata: true,
        prefix,
      };
    
      const images: string[] = [];
      const iterator = await this._containerClient.listBlobsFlat(listOptions).byPage({
        continuationToken,
        maxPageSize: pageSize,
      });

      const response = await iterator.next();

      if (response.done) {
        return { images: [], continuationToken: undefined };
      }

      for (const item of response.value.segment.blobItems) {
        images.push(item.name.split("/")[1]);
      }

      return { images, continuationToken: response.value.continuationToken };
    } catch (ex) {
      this._logger.error(
        { error: ex },
        "Error getting images list",
      );
      return { images: [], continuationToken: undefined };
    }
  }

  async exists(imageName: string) {
    try {
      if (!this._initialized) {
        await this.setup();
      }
     
      const blockBlobClient = this._containerClient.getBlockBlobClient(imageName);
      return await blockBlobClient.exists();
    } catch (ex) {
      this._logger.error(
        { imageName, error: ex },
        "Error checking if image exists",
      );
      return false;
    }
  }

  async persist(imageName: string, { mimeType, size }: { mimeType: string, size: number }, content: Uint8Array): Promise<boolean> {
    try {
      if (!this._initialized) {
        await this.setup();
      }

      this._logger.debug({ imageName }, "Persisting image");

      const blockBlobClient = this._containerClient.getBlockBlobClient(imageName);
      const uploadBlobResponse = await blockBlobClient.uploadData(
        content,
        {
          blockSize: size,
          blobHTTPHeaders: {
            blobContentType: mimeType
          }
        }
      );

      this._logger.debug(
        { imageName, requestId: uploadBlobResponse.requestId },
        "Persisted image",
      );

      return !uploadBlobResponse.errorCode;
    } catch (ex) {
      this._logger.error({ imageName, error: ex }, "Error persisting image");
      return false;
    }
  }

  async delete(imageName: string): Promise<boolean> {
    try {
      if (!this._initialized) {
        await this.setup();
      }

      this._logger.debug({ imageName }, "Deleting image");

      const blockBlobClient = this._containerClient.getBlockBlobClient(imageName);

      if (!(await blockBlobClient.exists())) {
        this._logger.debug({ imageName }, "Image not found");
        return false;
      }

      const deleteBlobResponse = await blockBlobClient.delete();

      this._logger.debug(
        { imageName, requestId: deleteBlobResponse.requestId },
        "Deleted image",
      );

      return !deleteBlobResponse.errorCode;
    } catch (ex) {
      this._logger.error({ imageName, error: ex }, "Error deleting the image");
      return false;
    }
  }

  async fetch(imageName: string): Promise<{ response: BlobDownloadResponseParsed | null; mimeType: string | null }> {
    try {
      if (!this._initialized) {
        await this.setup();
      }

      const blockBlobClient = this._containerClient.getBlockBlobClient(imageName);
      if (!(await blockBlobClient.exists())) {
        this._logger.debug({ imageName }, "Image not found");
        return { response: null, mimeType: null };
      }

      const contentType = (await blockBlobClient.getProperties()).contentType ?? "application/octet-stream";
      const response = await blockBlobClient.download(0);

      return { response, mimeType: contentType };
    } catch (ex) {
      this._logger.error(
        { imageName, error: ex },
        "Error fetching image data",
      );
      return { response: null, mimeType: null };
    }
  }

  async fetchToFile(imageName: string, filePath: string): Promise<void> {
    try {
      if (!this._initialized) {
        await this.setup();
      }

      const blockBlobClient = this._containerClient.getBlockBlobClient(imageName);
      if (!(await blockBlobClient.exists())) {
        this._logger.debug({ imageName }, "Image not found");
        throw new Error("Image not found");
      }

      await blockBlobClient.downloadToFile(filePath);
    } catch (ex) {
      this._logger.error(
        { imageName, error: ex },
        "Error fetching image data",
      );
      throw new Error("Error fetching image data");
    }
  }
}
