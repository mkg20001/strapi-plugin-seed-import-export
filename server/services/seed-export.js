'use strict'

const Packer = require('zip-stream')
const sanitize = require('sanitize-filename')

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
      // TODO: if i18n detected then get default locale

      const fileNameStore = {}

      async function sendOffFile (addEntry, file) {
        let name = file.name

        if (!name.endsWith(file.ext)) {
          name += file.ext
        }

        name = sanitize(name)

        while (fileNameStore[name]) {
          fileNameStore.replace(/(\.[a-z]+)$/, (_, type) => '-' + type)
        }

        fileNameStore[name] = true

        // await addEntry('seeds/files/' + name, getFile(file))

        return {
          name,
          alternativeText: file.alternativeText,
          caption: file.caption
        }
      }

      async function extractObj (addEntry, ct, obj, key) {
        switch (ct.attributes[key].type) {
          case 'media': {
            return {
              $_file: await sendOffFile(addEntry, obj[key])
            }
          }
          case 'relation': {
            // TODO: handle relations
            switch (ct.attributes[key].relation) {
              case 'oneToOne': {
                break
              }
              case 'oneToMany': {
                break
              }
              case 'manyToMany': {
                break
              }
              default: {
                throw new TypeError(ct.attributes[key].relation)
              }
            }
            break
          }
          default: {
            // TODO: make case for only primitives (also make this whole if a case) and then fail on default
            return obj[key]
          }
        }
      }

      return makeArchive(async addEntry => {
        for (let i = 0; i < models.length; i++) {
          const model = models[i]

          const ct = strapi.contentTypes[model]

          const populate = {
            localizations: true // always load i18n
          }

          const keysToCopy = []

          for (const key in ct.attributes) {
            const v = ct.attributes[key]

            if (v.configurable === false) {
              continue // ignore internal key
            }

            keysToCopy.push(key)

            if (v.type === 'relation' || v.type === 'media') {
              populate[key] = true
            }

            // TOOD: recursion
          }

          async function transformObject (keysToCopy, obj, ct) {
            const out = {}

            if (ct.options && ct.options.draftAndPublish) { // has publish system enabled, store value
              out.$_published = Boolean(obj.publishedAt)
            }

            for (let i = 0; i < keysToCopy.length; i++) {
              const key = keysToCopy[i]

              if (ct.attributes[key].pluginOptions && ct.attributes[key].pluginOptions.i18n && ct.attributes[key].pluginOptions.i18n.localized) {
                out[key] = {
                  $_localized: {}
                }

                const localized = obj.localizations.concat(obj)

                for (let i = 0; i < localized.length; i++) {
                  const objL = localized[i]

                  if (objL[key]) {
                    out[key].$_localized[objL.locale] = await extractObj(addEntry, ct, objL, key)
                  }
                }
              } else {
                out[key] = await extractObj(addEntry, ct, obj, key)
              }
            }

            return out
          }

          const res = await strapi.entityService.findMany(`${model}`, {
            populate
          })

          const seedData = await Promise.all(res.map(async obj => await transformObject(keysToCopy, obj, ct)))

          await addEntry(`seeds/${model}.json`, JSON.stringify(seedData))
        }
      })
    },
    getExportables () {
      return exportables // static
    }
  }
}
