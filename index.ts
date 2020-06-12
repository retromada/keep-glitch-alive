import fetch from 'node-fetch'
import express from 'express'

interface Options {
  projects?: string | string[]
  endpoint?: string
  interval?: number
  makeMeAwake?: boolean
}

/**
 * Keep multiple applications hosted on the glitch always alive
 * @param options
 * @param options.projects Domain of glitch projects
 * @param options.endpoint Endpoint where it will be pinged
 * @param options.interval Drip interval in minutes
 * @param options.makeMeAwake Whether this project will be pinged (valid if it is in the glitch)
 * @param app An express application
 */
function KeepGlitchAlive(
  {
    projects,
    endpoint = '/',
    interval = 2,
    makeMeAwake = true
  }: Options = {},
  app: express.Application | void,
  _express: boolean = false
) {
  if ((!projects || !projects.length) && !makeMeAwake) console.log('[ConfigError]', 'Provide project domain.')

  projects = !Array.isArray(projects) ? [String(projects)] : projects

  if (makeMeAwake) projects.push(String(process.env.PROJECT_DOMAIN))
  if (typeof app === undefined || !app) {
    app = express()
    _express = true
  }
  if (makeMeAwake) {
    app.get(endpoint, (request: express.Request, response: express.Response) => response.sendStatus(200))

    if (_express) app.listen(process.env.PORT)
  }

  const call = () => {
    endpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint

    return Promise.all([...projects].filter(Boolean).map((project) => {
      return fetch(`https://${project}.glitch.me/${endpoint}`)
        .then(({ status, statusText }) => ({ status, statusText, project }))
    }))
  }

  const pingProjects = () => {
    setTimeout(async () => {
      try {
        const calls = await call()

        calls.forEach((called) => console.log('[Called]', `"${called.project}"`, called.statusText, `(${called.status})`))
      } catch (error) {
        console.error('[CallError]', error)
      }

      pingProjects()
    }, interval * 60 * 1E3)
  }
  pingProjects()
}

export = KeepGlitchAlive