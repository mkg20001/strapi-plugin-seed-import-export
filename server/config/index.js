'use strict'

const Joi = require('joi')
const path = require('path')

const Type = Joi.object({
  seedsLocation: Joi.string()
})

module.exports = {
  default: {
    seedsLocation: path.join(strapi.dirs.root, 'seeds')
  },
  validator (conf) {
    const {error, value} = Type.validate(conf)

    if (error) {
      throw error
    }

    return value
  }
}
