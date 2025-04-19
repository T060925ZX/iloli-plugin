import plugin from "../../../lib/plugins/plugin.js";
import image from "../model/image.js";
import Cfg from '../model/Cfg.js';

export class example2 extends plugin {
    constructor() {
        super({
            name: '帮助插件',
            dsc: '更换更美观的帮助',
            event: 'message',
            priority: -114514,
            rule: [

                {
                    reg: '^(#|/)?(云崽|云宝|全部)?(帮助|菜单|help|功能|说明|指令|使用说明|命令)(列表)?$',
                    fnc: 'help'
                }
            ]
        });
    }

    async sendHelpImage(e, type) {
        let _path = process.cwd().replace(/\\/g, '/');
        const config = Cfg.getconfig('config', type);
        let { img } = await image(e, 'help', type, {
            saveId: 'help',
            cwd: _path,
            genshinPath: `${_path}/plugins/iloli-plugin/resources/`,
            helpData: config,
            version: HelpPluginVersion
        });
        e.reply(img);
    }

    async help(e) {
        await this.sendHelpImage(e, 'help');
    }
    
}
