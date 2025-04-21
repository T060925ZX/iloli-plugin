import fs from 'fs'
import path from 'path'
import yaml from 'yaml'
import lodash from 'lodash'

export function supportGuoba() {
  // 配置文件路径
  const configDir = path.join(process.cwd(), 'plugins/iloli-plugin/config')
  const configPath = path.join(configDir, 'config.yaml')
  const defaultConfigPath = path.join(configDir, 'default_config/config.yaml')

  // 读取配置的通用方法
  const getConfig = () => {
    try {
      let config = {}
      
      // 读取默认配置
      if (fs.existsSync(defaultConfigPath)) {
        const defaultData = fs.readFileSync(defaultConfigPath, 'utf8')
        config = yaml.parse(defaultData) || {}
      }
      
      // 合并用户配置
      if (fs.existsSync(configPath)) {
        const userData = fs.readFileSync(configPath, 'utf8')
        config = lodash.merge({}, config, yaml.parse(userData) || {})
      }
      
      return config
    } catch (e) {
      console.error('[iloli-plugin] 读取配置失败:', e)
      return {}
    }
  }

  return {
    pluginInfo: {
      name: 'iloli-plugin',
      title: '萝莉插件',
      description: '桀桀桀...小萝莉往哪跑...',
      author: '@Jiaozi',
      authorLink: 'https://github.com/T060925ZX',
      link: 'https://github.com/T060925ZX/iloli-plugin',
      isV3: true,
      isV2: false,
      showInMenu: true,
      icon: 'mdi:alpha-i-box-outline',
      iconColor: '#ff9ff3',
    },
    configInfo: {
      schemas: [
        {
          component: 'Divider',
          label: '系统设置',
          componentProps: {
            orientation: 'left',
            plain: true
          }
        },
        {
          field: 'summary',
          label: '图片外显',
          component: 'Input'
        },

        {
          component: 'Divider',
          label: '戳一戳设置',
          componentProps: {
            orientation: 'left',
            plain: true
          }
        },
        {
          field: 'chuo',
          label: '戳一戳功能',
          helpMessage: '是否启用戳一戳互动功能',
          component: 'Switch',
          componentProps: {
            activeText: '启用',
            inactiveText: '禁用'
          }
        },
        {
          field: 'probabilities_text',
          label: '文本回复概率',
          component: 'InputNumber',
          componentProps: {
            min: 0,
            max: 1,
            step: 0.01
          }
        },
        {
          field: 'probabilities_img',
          label: '图片回复概率',
          component: 'InputNumber',
          componentProps: {
            min: 0,
            max: 1,
            step: 0.01
          }
        },
        {
          field: 'probabilities_voice',
          label: '语音回复概率',
          component: 'InputNumber',
          componentProps: {
            min: 0,
            max: 1,
            step: 0.01
          }
        },
        {
          field: 'probabilities_mute',
          label: '禁言概率',
          component: 'InputNumber',
          componentProps: {
            min: 0,
            max: 1,
            step: 0.01
          }
        },
        {
          field: 'probabilities_video',
          label: '视频回复概率',
          component: 'InputNumber',
          componentProps: {
            min: 0,
            max: 1,
            step: 0.01
          }
        },
        {
          field: 'settings_master',
          label: '主人称呼',
          component: 'Input'
        },
        {
          field: 'settings_mutetime',
          label: '禁言时长(分钟)',
          component: 'InputNumber'
        },
        {
          field: 'settings_speakerapi',
          label: '语音合成API',
          component: 'Input'
        },
        {
          field: 'settings_emoji_api',
          label: '表情API地址',
          component: 'Input'
        },
        {
          field: 'settings_video_api',
          label: '视频API地址',
          component: 'Input'
        },
        {
          field: 'settings_tts_api',
          label: '语音合成API地址',
          component: 'Input'
        },
        {
          field: 'settings_redis_prefix',
          label: 'Redis前缀',
          component: 'Input'
        },

        {
          component: 'Divider',
          label: 'Moonshot AI 设置',
          componentProps: {
            orientation: 'left',
            plain: true
          }
        },
        {
          field: 'moonshot_sk',
          label: 'API Key',
          helpMessage: 'Moonshot AI 的 API Key',
          component: 'Input',
          componentProps: {
            type: 'password'
          }
        },
        {
          field: 'moonshot_model',
          label: '模型选择',
          helpMessage: 'Moonshot AI 使用的模型',
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
          label: 'API 地址',
          helpMessage: 'Moonshot AI 的 API 地址',
          component: 'Input'
        },

        {
          component: 'Divider',
          label: 'Deepseek AI 设置',
          componentProps: {
            orientation: 'left',
            plain: true
          }
        },
        {
          field: 'deepseek_sk',
          label: 'API Key',
          helpMessage: 'Deepseek AI 的 API Key',
          component: 'Input',
          componentProps: {
            type: 'password'
          }
        },
        {
          field: 'deepseek_model',
          label: '模型选择',
          helpMessage: 'Deepseek AI 使用的模型',
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
          label: 'API 地址',
          helpMessage: 'Deepseek AI 的 API 地址',
          component: 'Input'
        },

        {
          component: 'Divider',
          label: '通义千问设置',
          componentProps: {
            orientation: 'left',
            plain: true
          }
        },
        {
          field: 'qwen_api_key',
          label: 'API Key',
          helpMessage: '通义千问的 API Key',
          component: 'Input',
          componentProps: {
            type: 'password'
          }
        },
        {
          field: 'qwen_model',
          label: '模型选择',
          helpMessage: '通义千问使用的模型',
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
          label: 'API 地址',
          helpMessage: '通义千问的 API 地址',
          component: 'Input'
        },
        {
          field: 'qwen_enable_search',
          label: '联网搜索',
          helpMessage: '是否启用联网搜索功能',
          component: 'Switch',
          componentProps: {
            activeText: '启用',
            inactiveText: '禁用'
          }
        },
        
        {
          component: 'Divider',
          label: 'ICQQ表情回应',
          componentProps: {
            orientation: 'left',
            plain: true
          }
        },
        {
          field: 'emoji_enable',
          label: '启用功能',
          component: 'Switch',
          componentProps: {
            activeText: '启用',
            inactiveText: '禁用'
          }
        },
        {
          field: 'emoji_whiteUserList',
          label: '用户白名单',
          helpMessage: '填写真实QQ',
          component: 'GTags',
          componentProps: {
            allowAdd: true,
            allowDel: true,
          }
        },
        {
          field: 'emoji_blackUserList',
          label: '用户黑名单',
          helpMessage: '填写真实QQ',
          component: 'GTags',
          componentProps: {
            allowAdd: true,
            allowDel: true,
          }
        },
        {
          field: 'emoji_whiteGroupList',
          label: '群组白名单',
          helpMessage: '填写真实QQ群号',
          component: 'GTags',
          componentProps: {
            allowAdd: true,
            allowDel: true,
          }
        },
        {
          field: 'emoji_blackGroupList',
          label: '群组黑名单',
          helpMessage: '填写真实QQ群号',
          component: 'GTags',
          componentProps: {
            allowAdd: true,
            allowDel: true,
          }
        },
        {
          field: 'emoji_faceId',
          label: '表情ID',
          component: 'Input'
        },
        {
          field: 'emoji_random',
          label: '随机概率(%)',
          component: 'InputNumber'
        },
        {
          field: 'emoji_sleepTime',
          label: '间隔时间(ms)',
          component: 'InputNumber'
        },
        {
          field: 'emoji_all',
          label: '回应用户表情',
          component: 'Switch',
          componentProps: {
            activeText: '启用',
            inactiveText: '禁用'
          }
        },

        {
          component: 'Divider',
          label: 'NTQQ表情回应',
          componentProps: {
            orientation: 'left',
            plain: true
          }
        },
        {
          field: 'onebot_emoji_enable',
          label: '启用功能',
          component: 'Switch',
          componentProps: {
            activeText: '启用',
            inactiveText: '禁用'
          }
        },
        {
          field: 'onebot_emoji_whiteUserList',
          label: '用户白名单',
          helpMessage: '填写真实QQ',
          component: 'GTags',
          componentProps: {
            allowAdd: true,
            allowDel: true,
          }
        },
        {
          field: 'onebot_emoji_whiteGroupList',
          label: '群组白名单',
          helpMessage: '填写真实QQ',
          component: 'GTags',
          componentProps: {
            allowAdd: true,
            allowDel: true,
          }
        },
        {
          field: 'onebot_emoji_blackUserList',
          label: '用户黑名单',
          helpMessage: '填写真实QQ群号',
          component: 'GTags',
          componentProps: {
            allowAdd: true,
            allowDel: true,
          }
        },
        {
          field: 'onebot_emoji_blackGroupList',
          label: '群组黑名单',
          helpMessage: '填写真实QQ群号',
          component: 'GTags',
          componentProps: {
            allowAdd: true,
            allowDel: true,
          }
        },
        {
          field: 'onebot_emoji_globalRandom',
          label: '随机概率(%)',
          component: 'InputNumber'
        },
        {
          field: 'onebot_emoji_sleepTime',
          label: '间隔时间(ms)',
          component: 'InputNumber'
        },
        {
          field: 'onebot_emoji_all',
          label: '回应用户表情',
          component: 'Switch',
          componentProps: {
            activeText: '启用',
            inactiveText: '禁用'
          }
        },
        {
          field: 'onebot_emoji_fixedEmojiId',
          label: '固定表情ID',
          component: 'InputNumber'
        },

        {
          component: 'Divider',
          label: 'pixiv图设置',
          componentProps: {
            orientation: 'left',
            plain: true
          }
        },
        {
          field: 'pixiv_CD',
          label: '设置CD',
          helpMessage: '主人不受限制，单位为秒',
          component: 'InputNumber'
        },
        {
          field: 'pixiv_proxy',
          label: '在线反代服务',
          helpMessage: '出图真的慢，建议自行搭建反代使用魔法',
          component: 'Input'
        },
        {
          field: 'pixiv_proxyAddress',
          label: '设置代理地址',
          helpMessage: '没有可不填，默认为空字符串，但填上面的反代如果大陆访问不了就得填嗷',
          component: 'Input'
        },
        {
          field: 'pixiv_size',
          label: '返回图片的规格',
          helpMessage: '可写值：原图[original] 缩略图[regular]',
          component: 'Input'
        },
        {
          field: 'pixiv_excludeAI',
          label: '排除 AI 作品',
          component: 'Switch',
          componentProps: {
            activeText: '启用',
            inactiveText: '禁用'
          }
        },
        {
          field: 'pixiv_r18_Master',
          label: '主人图片规格',
          component: 'Select',
          componentProps: {
            options: [
              { label: 'R18-', value: '0' },
              { label: 'R18+', value: '1' },
              { label: 'R18±', value: '2' }
            ]
          }
        },
        {
          field: 'pixiv_r18',
          label: '群员图片规格',
          component: 'Select',
          componentProps: {
            options: [
              { label: 'R18-', value: '0' },
              { label: 'R18+', value: '1' },
              { label: 'R18±', value: '2' }
            ]
          }
        },

        {
          component: 'Divider',
          label: '其它设置',
          componentProps: {
            orientation: 'left',
            plain: true
          }
        },
        {
          field: 'ai_life_model',
          label: '模拟人生模型',
          helpMessage: '模拟人生使用的模型',
          component: 'Select',
          componentProps: {
            options: [
              { label: 'deepseek', value: 'deepseek' },
              { label: 'qwen', value: 'qwen' },
              { label: 'moonshot', value: 'moonshot' }
            ]
          }
        }
      ],
      getConfigData() {
        return getConfig()
      },
      async setConfigData(data, { Result }) {
        try {
          const currentConfig = getConfig()
          const newConfig = lodash.merge({}, currentConfig, data)
          
          // 确保目录存在
          if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true })
          }
          
          fs.writeFileSync(configPath, yaml.stringify(newConfig, {
            indent: 2,
            aliasDuplicateObjects: false
          }), 'utf8')
          
          return Result.ok({}, '配置保存成功')
        } catch (e) {
          console.error('[iloli-plugin] 保存配置失败:', e)
          return Result.fail(`保存配置失败: ${e.message}`)
        }
      }
    }
  }
}
