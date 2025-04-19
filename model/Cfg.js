import yaml from 'yaml';
import fs from 'node:fs';
import path from 'node:path';
import _ from 'lodash';

const _path = process.cwd().replace(/\\/g, '/');

class Cfg {
  constructor(pluginName = 'iloli-plugin') {
    this.pluginPath = `${_path}/plugins/${pluginName}`;
    this.userConfigDir = `${this.pluginPath}/config`;
    this.defaultConfigDir = `${this.pluginPath}/config/default_config`;
  }

  /** 获取用户配置（自动合并默认配置） */
  getConfig(name, parseYaml = true) {
    const userConfig = this._getUserConfig(name, parseYaml);
    const defaultConfig = this._getDefaultConfig(name, true);
    
    // 合并配置（用户配置优先）
    return _.merge({}, defaultConfig, userConfig);
  }

  /** 获取原始用户配置 */
  _getUserConfig(name, parseYaml = true) {
    const configPath = `${this.userConfigDir}/${name}.yaml`;
    return this._loadConfig(configPath, parseYaml);
  }

  /** 获取默认配置 */
  _getDefaultConfig(name, parseYaml = true) {
    const configPath = `${this.defaultConfigDir}/${name}.yaml`;
    return this._loadConfig(configPath, parseYaml);
  }

  /** 加载配置文件 */
  _loadConfig(path, parseYaml = true) {
    if (!fs.existsSync(path)) return {};
    
    try {
      const content = fs.readFileSync(path, 'utf8');
      return parseYaml ? yaml.parse(content) || {} : content;
    } catch (err) {
      console.error(`[Config] 加载配置失败 ${path}:`, err);
      return {};
    }
  }

  /** 设置用户配置 */
  setConfig(name, data, asYaml = true) {
    const configPath = `${this.userConfigDir}/${name}.yaml`;
    
    // 确保目录存在
    if (!fs.existsSync(this.userConfigDir)) {
      fs.mkdirSync(this.userConfigDir, { recursive: true });
    }

    try {
      const content = asYaml ? yaml.stringify(data) : data;
      fs.writeFileSync(configPath, content, 'utf8');
      return true;
    } catch (err) {
      console.error(`[Config] 保存配置失败 ${name}:`, err);
      return false;
    }
  }

  /** 检查默认配置是否存在 */
  hasDefaultConfig(name) {
    return fs.existsSync(`${this.defaultConfigDir}/${name}.yaml`);
  }
}

export default new Cfg();