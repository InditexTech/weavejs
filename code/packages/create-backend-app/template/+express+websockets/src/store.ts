import path from 'path'
import fs from 'fs/promises'
import http from 'http'
import { WeaveWebsocketsServer } from '@inditextech/weave-store-websockets/server'
import { createFolder, existsFolder } from '@/utils'

const VALID_ROOM_WEBSOCKET_URL = /\/sync\/rooms\/(.*)/

export const setupStore = (server: http.Server) => {
  const wss = new WeaveWebsocketsServer({
    performUpgrade: async (request: http.IncomingMessage) => {
      return VALID_ROOM_WEBSOCKET_URL.test(request.url ?? '')
    },
    extractRoomId: (request: http.IncomingMessage) => {
      const match = request.url?.match(VALID_ROOM_WEBSOCKET_URL)
      if (match) {
        return match[1]
      }
      return undefined
    },
    fetchRoom: async (docName: string) => {
      try {
        const roomsFolder = path.join(process.cwd(), 'rooms')

        if (!(await existsFolder(roomsFolder))) {
          await createFolder(roomsFolder)
        }

        const roomsFile = path.join(roomsFolder, docName)
        return await fs.readFile(roomsFile)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_) {
        return null
      }
    },
    persistRoom: async (
      docName: string,
      actualState: Uint8Array<ArrayBufferLike>
    ) => {
      try {
        const roomsFolder = path.join(process.cwd(), 'rooms')

        if (!(await existsFolder(roomsFolder))) {
          await createFolder(roomsFolder)
        }

        let folderExists = false
        try {
          await fs.access(roomsFolder)
          folderExists = true
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e) {
          folderExists = false
        }

        if (!folderExists) {
          await fs.mkdir(roomsFolder, { recursive: true })
        }

        const roomsFile = path.join(roomsFolder, docName)
        await fs.writeFile(roomsFile, actualState)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_) {
        /* empty */
      }
    }
  })

  wss.handleUpgrade(server)
}
