import path from 'path'
import fs from 'fs/promises'
import { WeaveAzureWebPubsubServer } from '@inditextech/weave-store-azure-web-pubsub/server'
import { createFolder, existsFolder } from '@/utils'

const endpoint = process.env.WEAVE_AZURE_WEB_PUBSUB_ENDPOINT
const key = process.env.WEAVE_AZURE_WEB_PUBSUB_KEY
const hubName = process.env.WEAVE_AZURE_WEB_PUBSUB_HUB_NAME

if (!endpoint || !key || !hubName) {
  throw new Error('Missing required environment variables')
}

let azureWebPubsubServer: WeaveAzureWebPubsubServer | null = null

export const getAzureWebPubsubServer = () => {
  if (!azureWebPubsubServer) {
    throw new Error('Azure Web Pubsub server not initialized')
  }

  return azureWebPubsubServer
}

export const setupStore = () => {
  azureWebPubsubServer = new WeaveAzureWebPubsubServer({
    pubsubConfig: {
      endpoint,
      key,
      hubName
    },
    fetchRoom: async (docName: string) => {
      try {
        const roomsFolder = path.join(__dirname, 'rooms')

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
        const roomsFolder = path.join(__dirname, 'rooms')

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
}
