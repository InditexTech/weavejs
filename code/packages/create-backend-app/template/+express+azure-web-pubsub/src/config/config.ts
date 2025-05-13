import { z } from 'zod'
import { ServiceConfig } from '../types.js'
import { DEFAULT_PORT } from '../constants.js'

const serviceConfigSchema = z.object({
  service: z.object({
    hostname: z
      .string({
        required_error:
          'Define the service hostname on the environment variable HOSTNAME'
      })
      .trim()
      .optional()
      .default('0.0.0.0'),
    port: z
      .number({
        required_error:
          'Define the service port on the environment variable PORT'
      })
      .int({ message: 'The post must be an integer' })
      .optional()
      .default(DEFAULT_PORT)
  })
})

export function getServiceConfig(): ServiceConfig {
  const hostname = process.env.HOSTNAME
  const port = parseInt(process.env.PORT || `${DEFAULT_PORT}`)

  const service = {
    hostname,
    port
  }

  const serviceConfig = { service }

  return serviceConfigSchema.parse(serviceConfig)
}
