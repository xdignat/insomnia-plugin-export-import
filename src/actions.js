const fs = require('fs')
const path = require('path')
const mkdirp = require('mkdirp')
const slugify = require('slugify')
const HtmlBuilder = require('./html.js');

const PREFIX = 'import-export';

class WorkSpaceActions {

  actionExport(context, models) {
    this.prepare(context, models);
    this.showExport();
  }

  actionImport(context, models) {
    this.prepare(context, models);
    this.showImport();
  }

  prepare(context, models) {
    this.context = context;
    this.app = context.app;
    this.store = context.store;
    this.models = models;
    this.workspace = models.workspace
  }

  configKey(name) {
    return `${this.workspace._id}:config:${name}`;
  }

  async configGet(name, def) {
    try {
      const key = this.configKey(name);
      return await this.store.getItem(key) || def;
    } catch (e) { }
  }

  async configSet(name, value) {
    const key = this.configKey(name);
    await this.store.setItem(key, value);
  }
  async configLoad() {
    const format = await this.configGet('format', 'json');
    return {
      format,
      path: await this.configGet('path', this.pathDef(format)),
    }
  }

  pathDef(format) {
    return path.join(this.app.getPath('desktop'), `${slugify(this.workspace.name)}`, `insomnia.${format}`);
  }

  async alert(caption, message) {
    return this.app.alert(caption, message);
  }

  async dialog(html, caption) {
    return this.app.dialog(caption, html.owner, {
      skinny: true,
      onHide: () => html.clear(),
    });
  }

  dialogClose() {
    const btn = document.getElementsByClassName('modal__close-btn');
    if (btn.length)
      btn[0].click();
  }

  pathResolve(filename, format) {
    filename = filename.trim();
    if (!filename)
      return self.pathDef(format);
    filename = path.resolve(filename);
    const { dir, name } = path.parse(filename);
    return path.format({ dir, name, ext: '.' + format });
  }

  async showExport() {
    const self = this;
    const config = await this.configLoad();

    const html = new HtmlBuilder({ prefix: PREFIX });

    html.make({
      tag: 'form', class: 'form-control form-control--outlined', onsubmit,
      items: [
        {
          tag: 'div', class: 'pad',
          items: [
            {
              tag: 'label', text: 'Имя файла:',
              items: { id: 'path', tag: 'input', type: 'text', value: config.path },
            },
            {
              tag: 'label', text: 'Формат:',
              items: {
                id: 'format', tag: 'select', oninput: onformat, value: config.format,
                items: [
                  { tag: 'option', value: 'json' },
                  { tag: 'option', value: 'yaml' },
                ],
              },
            },
          ],
        },
        {
          tag: 'div', class: 'modal__footer',
          items: { tag: 'button', type: 'submit', class: 'btn', text: 'Сохранить', },
        }
      ],
    });

    const inputPath = html.getById('path');
    const inputFormat = html.getById('format');

    await this.dialog(html, `Экспорт - ${this.workspace.name}`);

    function onformat() {
      inputPath.value = self.pathResolve(inputPath.value, inputFormat.value);
    }

    function onsubmit() {
      const format = inputFormat.value;
      const filename = inputPath.value.trim();
      const resolved = inputPath.value = self.pathResolve(filename, format);
      if (filename === resolved) {
        self.configSet('path', filename);
        self.configSet('format', format);
        self.dialogClose();
        self.export(filename, format);
      }
    }
  }

  async showImport() {
    const self = this;
    const config = await this.configLoad();

    const html = new HtmlBuilder({ prefix: PREFIX });

    html.make({
      tag: 'form', class: 'form-control form-control--outlined', onsubmit,
      items: [
        {
          tag: 'div', class: 'pad',
          items: [
            {
              tag: 'label', text: 'Имя файла:',
              items: { id: 'path', tag: 'input', type: 'text', value: config.path },
            },
            {
              tag: 'label', text: 'Формат:',
              items: {
                id: 'format', tag: 'select', oninput: onformat, value: config.format,
                items: [
                  { tag: 'option', value: 'json' },
                  { tag: 'option', value: 'yaml' },
                ],
              },
            },
          ],
        },
        {
          tag: 'div', class: 'modal__footer',
          items: { tag: 'button', type: 'submit', class: 'btn', text: 'Загрузить', },
        }
      ],
    });

    const inputPath = html.getById('path');
    const inputFormat = html.getById('format');


    await this.dialog(html, `Импорт - ${this.workspace.name}`);

    function onformat() {
      inputPath.value = self.pathResolve(inputPath.value, inputFormat.value);
    }

    function onsubmit() {
      const format = inputFormat.value;
      const filename = inputPath.value.trim();
      const resolved = inputPath.value = self.pathResolve(filename, format);
      if (filename === resolved) {
        self.configSet('path', filename);
        self.configSet('format', format);
        self.dialogClose();
        self.import(filename);
      }
    }
  }

  async export(filename, format) {
    try {
      const dir = path.dirname(filename);
      await mkdirp(dir);
    } catch (e) {
      await this.alert('Ошибка создания папки', e.message);
      return;
    }

    try {
      let data = await this.context.data.export.insomnia({
        workspace: this.workspace,
        format,
        includePrivate: false
      })
      if (format === 'json')
        data = JSON.stringify(JSON.parse(data), null, 2);
      fs.writeFileSync(filename, data);
    } catch (e) {
      await this.alert('Ошибка при экспорте', e.message);
      return;
    }

    await this.alert('Документ был сохранён!', filename);
  }

  async import(filename) {
    try {
      const data = fs.readFileSync(filename, 'utf8');
      await this.context.data.import.raw(data);
    } catch (e) {
      await this.alert('Ошибка при импорте', e.message);
      return;
    }

    await this.alert('Документ был загружен!', filename);
  }

}

module.exports = WorkSpaceActions;