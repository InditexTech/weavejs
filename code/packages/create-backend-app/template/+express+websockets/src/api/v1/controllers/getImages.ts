import { Request, Response } from "express";
import { ImagesPersistenceHandler } from "../../../images/persistence.js";

export const getImagesController = () => {
  const persistenceHandler = new ImagesPersistenceHandler()
  
  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId;

    const pageSize = parseInt(req.query.pageSize as string | undefined ?? "20");
    const continuationToken = req.query.continuationToken as string | undefined;

    const images = await persistenceHandler.list(roomId, pageSize, continuationToken);

    res.status(200).json(images);
  };
}
