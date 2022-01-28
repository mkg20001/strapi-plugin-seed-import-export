module.exports = [
  {
    method: 'POST',
    path: '/export',
    handler: 'seedExport.export',
    config: {
      policies: []
    }
  }
]
