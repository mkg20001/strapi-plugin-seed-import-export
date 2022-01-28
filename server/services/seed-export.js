'use strict';

const Packer = require('zip-stream');

const prom = f => new Promise((resolve, reject) => f((err, res) => err ? reject(err) : resolve(res))

async function makeArchive(f) {
  const archive = new Packer(); // OR new Packer(options)

  async function addEntry(file, contents) {
    return prom(cb => archive.entry(contents, { name: file }, cb))
  }

  return [archive, prom(cb => {
    archive.on('error', function(err) {
      cb(err)
    });

    f(addEntry).resolve(() => {
      archive.finish()
      cb()
    }, err => cb(err))
  })]
}

module.exports = ({ strapi }) => ({
  seedExport(models = [], populate = false) {
    return makeArchive(async addEntry => {
      await addEntry(archive, 'seeds/', null)
      await addEntry(archive, 'seeds/files/', null)

      for (let i = 0; i < models.length; i++) {
        let model = models[i]

        const res = await strapi.db.query(`api::${model}.${model}`).findMany({
          // only populate if the user wants to
          populate: populate ? "*" : null
        });

        await addEntry(`seeds/${model}.json`, JSON.stringify(res))
      }
    })
  },
});
