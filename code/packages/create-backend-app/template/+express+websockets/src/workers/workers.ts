import { cpus } from 'os'
import { Worker } from 'worker_threads'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let queue: any = null

export const setupWorkers = async () => {
  const PQueue = await import('p-queue')
  queue = new PQueue.default({ concurrency: cpus().length })
}

export function runWorker<T>(
  workerPath: string,
  workerData?: unknown
): Promise<void | T> {
  if (!queue) {
    throw new Error('Workers not initialized. Call setupWorkers() first.')
  }

  return queue.add(async () => {
    const worker = new Worker(workerPath)

    const result = await new Promise<T>((resolve, reject) => {
      worker.on('message', resolve)
      worker.on('error', reject)
      worker.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`))
        }
      })
      worker.postMessage(workerData)
    })

    return result
  })
}
