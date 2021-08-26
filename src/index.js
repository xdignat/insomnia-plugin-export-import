const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const slugify = require('slugify');
const WorkSpaceActions = require('./actions');

const actions = new WorkSpaceActions();

module.exports.workspaceActions = [
  {
    icon: 'fa-cloud-upload',
    label: 'Экспорт',
    action: async (context, models) => actions.actionExport(context, models),
  },
  {
    icon: 'fa-cloud-download',
    label: 'Импорт',
    action: async (context, models) => actions.actionImport(context, models),
  },
]
