'use strict'

module.exports = [
  {
    method: 'POST',
    path: '/export',
    handler: 'seedExport.export',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin'
      ]
    }
  },
  {
    method: 'GET',
    path: '/exportables',
    handler: 'seedExport.getExportables',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin'
      ]
    }
  }
]
