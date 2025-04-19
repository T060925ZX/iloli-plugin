import fs from 'fs'
import path from 'path'
import yaml from 'yaml'
import lodash from 'lodash'

export function supportGuoba() {
  const configDir = path.join(process.cwd(), 'plugins/iloli-plugin/config')
  const configPath = path.join(configDir, 'config.yaml')
  const defaultConfigPath = path.join(configDir, 'default_config/config.yaml')

  const getConfig = () => {
    try {
      let config = {}
      if (fs.existsSync(defaultConfigPath)) {
        config = yaml.parse(fs.readFileSync(defaultConfigPath, 'utf8')) || {}
      }
      if (fs.existsSync(configPath)) {
        config = lodash.merge({}, config, yaml.parse(fs.readFileSync(configPath, 'utf8')) || {})
      }
      return config
    } catch (e) {
      console.error('[iloli-plugin] 配置读取失败:', e)
      return {}
    }
  }

  return {
    pluginInfo: {
      name: 'iloli-plugin',
      title: '萝莉插件',
      description: '桀桀桀',
      author: '@Jiaozi',
      authorLink: 'https://github.com/T060925ZX',
      link: 'https://github.com/T060925ZX/iloli-plugin',
      isV3: true,
      showInMenu: true,
      icon: 'mdi:robot-happy-outline',
      iconColor: '#ff9ff3',
    },
    configInfo: {
      schemas: [
        // ============ 基础开关 ============
        {
          component: 'Divider',
          label: '基础开关',
          componentProps: { orientation: 'left', plain: true }
        },
        {
          field: 'chuo',
          label: '戳一戳功能总开关',
          component: 'Switch',
          componentProps: { activeText: '启用', inactiveText: '禁用' }
        },

        // ============ 概率设置 ============
        {
          component: 'Divider',
          label: '回复概率设置',
          componentProps: { orientation: 'left', plain: true }
        },
        {
          field: 'probabilities.text',
          label: '文字回复概率',
          component: 'InputNumber',
          componentProps: { min: 0, max: 1, step: 0.01, precision: 2 },
          helpMessage: '0-1之间的小数，例如0.6表示60%概率'
        },
        {
          field: 'probabilities.img',
          label: '图片回复概率',
          component: 'InputNumber',
          componentProps: { min: 0, max: 1, step: 0.01, precision: 2 }
        },
        {
          field: 'probabilities.voice',
          label: '语音回复概率',
          component: 'InputNumber',
          componentProps: { min: 0, max: 1, step: 0.01, precision: 2 }
        },
        {
          field: 'probabilities.mute',
          label: '禁言概率',
          component: 'InputNumber',
          componentProps: { min: 0, max: 1, step: 0.01, precision: 2 }
        },
        {
          field: 'probabilities.video',
          label: '视频回复概率',
          component: 'InputNumber',
          componentProps: { min: 0, max: 1, step: 0.01, precision: 2 },
          bottomHelpMessage: '所有概率总和建议不超过1'
        },

        // ============ 基础设置 ============
        {
          component: 'Divider',
          label: '基础参数设置',
          componentProps: { orientation: 'left', plain: true }
        },
        {
          field: 'settings.master',
          label: '主人称呼',
          component: 'Input',
          componentProps: { placeholder: '设置主人称呼显示' }
        },
        {
          field: 'settings.mutetime',
          label: '基础禁言时间(分钟)',
          component: 'InputNumber',
          componentProps: { min: 0, precision: 0 },
          helpMessage: '0表示自动递增'
        },
        {
          field: 'settings.speakerapi',
          label: '语音合成角色',
          component: 'Input',
          componentProps: { placeholder: '设置语音合成角色' }
        },
        {
          field: 'settings.emoji_api',
          label: '表情包API地址',
          component: 'Input',
          componentProps: { placeholder: '输入表情包API完整URL' }
        },
        {
          field: 'settings.video_api',
          label: '视频API地址',
          component: 'Input',
          componentProps: { placeholder: '输入视频API完整URL' }
        },
        {
          field: 'settings.tts_api',
          label: '语音合成API地址',
          component: 'Input',
          componentProps: { placeholder: '输入TTS API完整URL' }
        },
        {
          field: 'settings.redis_prefix',
          label: 'Redis计数前缀',
          component: 'Input',
          componentProps: { placeholder: '设置Redis计数前缀' }
        },

        // ============ AI接口设置 ============
        {
          component: 'Divider',
          label: 'Moonshot AI 设置',
          componentProps: { orientation: 'left', plain: true }
        },
        {
          field: 'moonshot_sk',
          label: 'API Key',
          component: 'Input',
          componentProps: { placeholder: '输入Moonshot API Key' }
        },
        {
          field: 'moonshot_model',
          label: '模型选择',
          component: 'Select',
          componentProps: {
            options: [
              { label: 'moonshot-v1-8k', value: 'moonshot-v1-8k' },
              { label: 'moonshot-v1-32k', value: 'moonshot-v1-32k' },
              { label: 'moonshot-v1-128k', value: 'moonshot-v1-128k' }
            ]
          }
        },
        {
          field: 'moonshot_url',
          label: 'API地址',
          component: 'Input',
          componentProps: { placeholder: '输入Moonshot API地址' }
        },

        {
          component: 'Divider',
          label: 'Deepseek AI 设置',
          componentProps: { orientation: 'left', plain: true }
        },
        {
          field: 'deepseek_sk',
          label: 'API Key',
          component: 'Input',
          componentProps: { placeholder: '输入Deepseek API Key' }
        },
        {
          field: 'deepseek_model',
          label: '模型选择',
          component: 'Select',
          componentProps: {
            options: [
              { label: 'deepseek-chat', value: 'deepseek-chat' },
              { label: 'deepseek-coder', value: 'deepseek-coder' }
            ]
          }
        },
        {
          field: 'deepseek_url',
          label: 'API地址',
          component: 'Input',
          componentProps: { placeholder: '输入Deepseek API地址' }
        },

        {
          component: 'Divider',
          label: '通义千问设置',
          componentProps: { orientation: 'left', plain: true }
        },
        {
          field: 'qwen_api_key',
          label: 'API Key',
          component: 'Input',
          componentProps: { placeholder: '输入通义千问API Key' }
        },
        {
          field: 'qwen_model',
          label: '模型选择',
          component: 'Select',
          componentProps: {
            options: [
              { label: 'qwen-turbo', value: 'qwen-turbo' },
              { label: 'qwen-plus', value: 'qwen-plus' },
              { label: 'qwen-max', value: 'qwen-max' }
            ]
          }
        },
        {
          field: 'qwen_base_url',
          label: 'API地址',
          component: 'Input',
          componentProps: { placeholder: '输入通义千问API地址' }
        },
        {
          field: 'qwen_enable_search',
          label: '启用联网搜索',
          component: 'Switch',
          componentProps: { activeText: '启用', inactiveText: '禁用' }
        },
        {
          component: 'Divider',
          label: '系统设置',
          componentProps: { orientation: 'left', plain: true }
        },
        {
          field: 'deviceScaleFactor',
          label: '设备缩放因子',
          component: 'InputNumber',
          componentProps: { min: 0.1, max: 2, step: 0.1 },
          helpMessage: '影响部分渲染内容的缩放比例'
        }
      ],
      getConfigData: getConfig,
      async setConfigData(data, { Result }) {
        try {
          const config = lodash.merge({}, getConfig(), data)
          if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true })
          fs.writeFileSync(configPath, yaml.stringify(config, { indent: 2 }), 'utf8')
          return Result.ok({}, '配置保存成功')
        } catch (e) {
          console.error('[iloli-plugin] 保存失败:', e)
          return Result.fail(`保存失败: ${e.message}`)
        }
      }
    }
  }
}