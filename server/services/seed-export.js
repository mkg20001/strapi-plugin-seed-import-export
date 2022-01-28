'use strict'

const Packer = require('zip-stream')

const prom = f => new Promise((resolve, reject) => f((err, res) => err ? reject(err) : resolve(res)))

function makeArchive (f) {
  const archive = new Packer() // OR new Packer(options)

  async function addEntry (file, contents) {
    return prom(cb => archive.entry(contents, { name: file }, cb))
  }

  return [archive, prom(cb => {
    archive.on('error', function (err) {
      cb(err)
    })

    f(addEntry).then(() => {
      archive.finish()
      cb()
    }, err => cb(err))
  })]
}

module.exports = ({ strapi }) => {
  const exportables = []

  Object.values(strapi.contentTypes).forEach(model => {
    // ignore invisible things
    if (model.pluginOptions && model.pluginOptions['content-manager'] && model.pluginOptions['content-manager'].visible === false) {
      return
    }

    exportables.push({
      id: model.uid,
      info: model.info,
      kind: model.kind
    })
  })

  return {
    seedExport (models = [], populate = false) {
      return makeArchive(async addEntry => {
        for (let i = 0; i < models.length; i++) {
          const model = models[i]

          const res = await strapi.db.query(`${model}`).findMany({
          // only populate if the user wants to
            populate: populate ? '*' : null
          })

          await addEntry(`seeds/${model}.json`, JSON.stringify(res))
        }
      })
    },
    getExportables () {
      return exportables // static
    }
  }
}
