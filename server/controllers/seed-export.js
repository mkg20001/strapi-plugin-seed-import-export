'use strict'

const Joi = require('joi')

const Export = Joi.object({
  models: Joi.array().items(Joi.string()).required().min(1),
  populate: Joi.boolean().default(false)
})

module.exports = {
  export (ctx) {
    const { error, value } = Export.validate(JSON.parse(JSON.stringify(ctx.request.body)))

    if (error) {
      ctx.body = error
      return
    }

    const [stream, prom] = strapi
      .plugin('strapi-plugin-seed-import-export')
      .service('seedExport')
      .seedExport(value.models, value.populate)

    ctx.body = stream
  },
  getExportables (ctx) {
    ctx.body = strapi
      .plugin('strapi-plugin-seed-import-export')
      .service('seedExport')
      .getExportables()
  }
}
