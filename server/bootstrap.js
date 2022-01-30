'use strict'

const fs = require('fs')
const path = require('path')
const mime = require('mime-types')
const set = require('lodash.set')
const get = require('lodash.get')
const Joi = require('joi')

async function isFirstRun () {
  const pluginStore = strapi.store({
    environment: strapi.config.environment,
    type: 'type',
    name: 'setup'
  })

  const initHasRun = await pluginStore.get({ key: 'initHasRun' })
  await pluginStore.set({ key: 'initHasRun', value: true })
  return !initHasRun
}

async function setPublicPermissions (newPermissions) {
  // Find the ID of the public role
  const publicRole = await strapi
    .query('plugin::users-permissions.role')
    .findOne({
      where: {
        type: 'public'
      }
    })

  // Create the new permissions and link them to the public role
  const allPermissionsToCreate = []
  Object.keys(newPermissions).map(controller => {
    const actions = newPermissions[controller]
    const permissionsToCreate = actions.map(action => {
      return strapi.query('plugin::users-permissions.permission').create({
        data: {
          action: `api::${controller}.${controller}.${action}`,
          role: publicRole.id
        }
      })
    })
    allPermissionsToCreate.push(...permissionsToCreate)
  })
  await Promise.all(allPermissionsToCreate)
}

function getFileSizeInBytes (filePath) {
  const stats = fs.statSync(filePath)
  const fileSizeInBytes = stats.size
  return fileSizeInBytes
}

function getFileData (filesLoc, fileName) {
  const filePath = path.join(filesLoc, fileName)

  // Parse the file metadata
  const size = getFileSizeInBytes(filePath)
  const ext = fileName.split('.').pop()
  const mimeType = mime.lookup(ext)

  return {
    path: filePath,
    name: fileName,
    size,
    type: mimeType
  }
}

// Create an entry and attach files if there are any
async function createEntry ({ model, entry, files }) {
  try {
    // TODO: l10n

    const published = entry.$_published

    if (published != null) {
      // TODO: published status
    }

    if (files) {
      for (const [key, file] of Object.entries(files)) {
        // Get file name without the extension
        const [fileName] = file.meta ? file.meta.name : file.data.name.split('.')
        // Upload each individual file
        const uploadedFile = await strapi
          .plugin('upload')
          .service('upload')
          .upload({
            files: file,
            data: {
              fileInfo: file.meta || {
                alternativeText: fileName,
                caption: fileName,
                name: fileName
              }
            }
          })

        // Attach each file to its entry
        set(entry, key, uploadedFile[0].id)
      }
    }

    // Actually create the entry in Strapi
    const createdEntry = await strapi.entityService.create(
      `${model}`,
      {
        data: entry
      }
    )
  } catch (e) {
    // TODO: revert other additions
    console.log('model', entry, e)
    throw e
  }
}

function filterFiles (lvl, root, stack, files) {
  if (lvl._file != null) {
    let meta
    let fileName

    if (typeof lvl._file === 'string') {
      fileName = lvl._file
    } else {
      fileName = lvl._file.fsName
      meta = lvl._file
    }

    const file = fileName.replace(/\$\{([a-z0-9.-]+)\}/g, (_, path) => get(root, path))

    files[stack.join('.')] = {
      data: getFileData(file),
      meta
    }

    // replace with null
    return null
  }

  for (const key in lvl) {
    if (Array.isArray(lvl)) {
      return lvl.map((lvl, i) => filterFiles(lvl, root, stack.concat([i])))
    } else if (typeof lvl[key] === 'object') {
      const out = {}

      for (const key in lvl) {
        out[key] = filterFiles(lvl[key], root, stack.concat([key]), files)
      }

      return out
    } else {
      // don't do anything. this is some primitive (string, int, whatev)
      return lvl
    }
  }
}

async function processEntry (g, entry, model) {
  const files = {}

  filterFiles(entry, entry, [], files)

  return createEntry({ model, entry, files })
}

/* async function importSeedData () {
  // Allow read of application content types
  await setPublicPermissions({
    global: ['find'],
    homepage: ['find'],
    article: ['find', 'findOne'],
    category: ['find', 'findOne'],
    writer: ['find', 'findOne']
  })

  const proms = []

  // Create all entries
  for (const model in data) {
    const entries = Array.isArray(data[model]) ? data[model] : [data[model]]
    entries.forEach(entry => proms.push(processEntry(entry, model)))
  }

  await Promise.all(proms)
} */

const ModelType = Joi.object({
  data: Joi.any(),
  permissions: Joi.object(),
  updatedAt: Joi.date().required()
}).required()

async function processSeed (g, { model, json }) {
  strapi.log.info(`[seed-import-export] Processing ${model}`)

  let parsed

  try {
    parsed = JSON.parse(fs.readFileSync(json))
  } catch(error) {
    console.error(error)
    return strapi.log.error(`[seed-import-export] ${json} is formatted wrongly`)
  }

  const { value, error } = ModelType.validate(parsed)
  const {
    data,
    permissions,
    updatedAt
  } = value

  if (error) {
    console.error(error)
    return strapi.log.error(`[seed-import-export] ${json} is formatted wrongly`)
  }

  const ct = strapi.contentTypes[model]

  if (!ct) {
    return error(`Content-Type ${model} not found in strapi - these seeds dont seem to belong`)
  }

  let entry = strapi.entityService.findOne('plugin::strapi-plugin-seed-import-export.seed', {
    model
  })

  if (!entry) {
    entry = {
      model
    }
  }

  if (entry.updatedAt) {
    // TODO: incremental updates and stuff?
    return strapi.log.warn(`[seed-import-export] ${model} already imported, ignoring`)
  }

  entry.updatedAt = updatedAt

  switch (ct.kind) {
    case 'collectionType': {
      if (data) {
        await Promise.all(data.map(async data => await processEntry(g, data, model)))
      }
      break
    }
    case 'singleType': {
      if (data) {
        await processEntry(g, data, model)
      }
      break
    }
    default: {
      throw new TypeError(ct.kind)
    }
  }

  strapi.log.info(`[seed-import-export] Imported ${model}`)
}

module.exports = async () => {
  const loc = strapi.config.get('strapi-plugin-seed-import-export.seedsLocation') || '/home/maciej/Projekte/strapi-seed/seeds'
  const filesLoc = path.join(loc, 'files')

  if (!fs.existsSync(loc)) {
    strapi.log.warn(`[seed-import-export] Seed location ${loc} does not exist. You can export data from the admin panel and place the seeds folder here or modify the location using 'seedsLocation' option`)
    return
  }

  const g = { loc, filesLoc }

  const things = fs.readdirSync(loc)

  for (let i = 0; i < things.length; i++) {
    const thing = things[i]

    const json = path.join(loc, thing)
    const stat = fs.lstatSync(json)

    if (stat.isFile() && thing.endsWith('.json')) {
      const model = thing.replace(/\.json$/, '')

      await processSeed(g, { model, json })
    }
  }
}
