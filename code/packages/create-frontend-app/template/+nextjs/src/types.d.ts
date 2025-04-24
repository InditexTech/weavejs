import { BlobServiceClient } from "@azure/storage-blob";

declare namespace Express {
  interface Request {
    storage: BlobServiceClient;
  }
}
