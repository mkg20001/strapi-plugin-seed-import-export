'use strict';

module.exports = {
  index(ctx) {
    ctx.body = strapi
      .plugin('strapi-plugin-seed-import-export')
      .service('seedExport')
      .seedExport();
  },
};
