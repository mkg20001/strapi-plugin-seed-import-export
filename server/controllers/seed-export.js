'use strict'

module.exports = {
  export (ctx) {
    const [stream, prom] = strapi
      .plugin('strapi-plugin-seed-import-export')
      .service('seedExport')
      .seedExport()
    ctx.body = stream
  },
  getExportables (ctx) {
    ctx.body = strapi
      .plugin('strapi-plugin-seed-import-export')
      .service('seedExport')
      .getExportables()
  }
}
