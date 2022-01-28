'use strict'

const Joi = require('joi')

const Type = Joi.object({
  seedsLocation: Joi.string()
})

module.exports = {
  default: {}, // TODO: default for seedsLocation
  validator (conf) {
    const [error, data] = Type.validate(conf)
    if (error) {
      throw error
    }

    return data
  }
}
