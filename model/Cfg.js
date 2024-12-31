import yaml from 'yaml';
import fs from 'node:fs';
import path from 'node:path';

const _path = process.cwd().replace(/\\/g, '/');

class Cfg {
  constructor() {
    this.file = `${_path}/plugins/iloli-plugin/config`; 
    this.defile = `${_path}/plugins/iloli-plugin/config`; 
  }

  /** 解析单个配置文件 */
  getconfig(file, name) {
    let cfgyaml = path.join(file, `${name}.yaml`);
    const configData = fs.readFileSync(cfgyaml, 'utf8');
    return yaml.parse(configData);
  }

  /** 获取用户配置 */
  getConfig(app) {
    const configPath = path.join(this.file, `${app}.yaml`);
    const configData = fs.readFileSync(configPath, 'utf8');
    return yaml.parse(configData);
  }

  /** 获取默认配置 */
  getdef(app) {
    const defPath = path.join(this.defile, `${app}.yaml`);
    const configData = fs.readFileSync(defPath, 'utf8');
    return yaml.parse(configData);
  }

  /** 设置用户配置 */
  setConfig(app, data) {
    const configPath = path.join(this.file, `${app}.yaml`);
    fs.writeFileSync(configPath, yaml.stringify(data), 'utf8');
  }
}

export default new Cfg();
