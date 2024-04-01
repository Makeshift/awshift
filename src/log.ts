import { createLogger, format, transports } from 'winston'

const log = createLogger({
  level: process.env.LOG_LEVEL ?? 'info',
  format: format.cli(),
  transports: [
    new transports.Console({
      level: process.env.LOG_LEVEL ?? 'info'
    })
  ]
})

export default log
