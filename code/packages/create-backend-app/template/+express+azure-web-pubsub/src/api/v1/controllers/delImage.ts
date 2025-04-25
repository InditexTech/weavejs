import { Request, Response } from "express";
import { ImagesPersistenceHandler } from "../../../images/persistence.js";

export const delImageController = () => {
  const persistenceHandler = new ImagesPersistenceHandler()

  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId;
    const imageId = req.params.imageId;

    const fileName = `${roomId}/${imageId}`;

    const result = await persistenceHandler.delete(fileName);

    if (result) {
      res.status(200).json({ status: "KO", message: "Image deleted" });
      return;
    }

    res.status(404).json({ status: "KO", message: "Image not found" });
  };
}
