import path from 'path'
import { fileURLToPath } from 'node:url'
import { Request, Response } from 'express'
import { createFolder, existsFolder, existFile } from '@/utils.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const getRoomController =
  () =>
  async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId

    try {
      const roomsFolder = path.join(__dirname, '..', '..', '..', 'rooms')

      if (!(await existsFolder(roomsFolder))) {
        await createFolder(roomsFolder)
      }

      const roomsFile = path.join(roomsFolder, roomId)

      if (!(await existFile(roomsFile))) {
        res.status(404).json({ status: 'KO', message: 'Room not found' })
        return
      }

      res.download(roomsFile)
    } catch (error) {
      console.log(error)
      res.status(500).json({ status: 'KO', message: 'Error fetching the room' })
    }
  }
