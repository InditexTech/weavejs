import fs from "node:fs";
import path from "node:path";
import { Request, Response } from "express";
import {removeBackground} from "@imgly/background-removal-node";
import { ImagesPersistenceHandler } from "../../../images/persistence.js";

async function myBlobToUIntDemo(blob: Blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);;
  return new Uint8Array(buffer);
}

export const postRemoveBackgroundController = () => {
  const persistenceHandler = new ImagesPersistenceHandler()
  
  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId;
    const imageId = req.params.imageId;

    const fileName = `${roomId}/${imageId}`;

    if (!await persistenceHandler.exists(fileName)) {
      res.status(404).json({ status: "KO", message: "Image doesn't exists" });
      return 
    }

    try {
      const filePathDownload = path.join(process.cwd(), "temp", imageId);
      await persistenceHandler.fetchToFile(fileName, filePathDownload);

      removeBackground(filePathDownload, {
        publicPath: `file://${path.join(process.cwd(), "public")}/`,
        output: { format: 'image/png', quality: 1 }
      })
        .then(async (blob: Blob) => {
          // The result is a blob encoded as PNG. It can be converted to an URL to be used as HTMLImage.src
          const data = await myBlobToUIntDemo(blob);
          const fileNameRemoved = `${fileName}-removed`;
          await persistenceHandler.persist(fileNameRemoved, { size: data.length, mimeType: "image/png" }, data);
          fs.rmSync(filePathDownload);

          res.status(201).json({ status: "Image created OK", fileName: fileNameRemoved, mimeType: "image/png" });
        })
        .catch(err => {
          console.error(err);
          res.status(500).json({ status: "KO", message: "Error transforming the image" });
        });
      } catch (ex) {
        console.error(ex);
        res.status(500).json({ status: "KO", message: "Error downloading the image" });
      }
  };
}
