import { Request, Response } from 'express';
import { ImagesPersistenceHandler } from '../../../images/persistence.js';

export const getImageController = () => {
  const persistenceHandler = new ImagesPersistenceHandler();

  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId;
    const imageId = req.params.imageId;

    const fileName = `${roomId}/${imageId}`;

    if (!(await persistenceHandler.exists(fileName))) {
      res.status(404).json({ status: 'KO', message: "Image doesn't exists" });
      return;
    }

    const filePath = await persistenceHandler.getFilePath(fileName);

    if (filePath) {
      res.sendFile(filePath, (err) => {
        if (err) {
          console.error('File not found or error sending file:', err.message);
          res.status(404).send('Image not found');
        }
      });
    } else {
      res
        .status(500)
        .json({ status: 'KO', message: 'Error downloading image' });
    }
  };
};
