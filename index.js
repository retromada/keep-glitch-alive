const fetch = require('node-fetch')
const express = require('express')

/**
 * Keep multiple applications hosted on the glitch always alive
 * @param {Object} [options]
 * @param {String|Array<String>} [options.projects] - Domain of glitch projects
 * @param {String} [options.endpoint] - Endpoint where it will be pinged
 * @param {Number} [options.interval] - Drip interval in minutes
 * @param {Boolean} [options.makeMeAwake] - Whether this project will be pinged (valid if it is in the glitch)
 * @param {Function} app - An express function
 */
module.exports = ({
  projects = null,
  endpoint = '/',
  interval = 2,
  makeMeAwake = true
} = {}, app, _express = false) => {
  if ((!projects || !projects.length) && !makeMeAwake) console.log('[ConfigError]', 'Provide project domain.')

  projects = !Array.isArray(projects) ? [projects] : projects

  if (makeMeAwake) projects.push(process.env.PROJECT_DOMAIN)
  if (typeof app === undefined || !app) {
    app = express()
    _express = true
  }

  if (makeMeAwake) {
    app.get(endpoint, (request, response) => response.sendStatus(200))

    if (_express) app.listen(process.env.PORT)
  }

  const call = () => {
    endpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint

    return Promise.all(projects.filter(Boolean).map((project) => {
      return fetch(`https://${project}.glitch.me/${endpoint}`)
        .then((response) => ({ status: response.status, statusText: response.statusText }))
    }))
  }

  (pingProjects = () => {
    setTimeout(async () => {
      try {
        const calls = await call()

        calls.forEach((called) => console.log('[Called]', called.statusText, `(${called.status})`))
      } catch (error) {
        console.error('[CallError]', error)
      }

      pingProjects()
    }, interval * 60 * 1E3)
  })()
}