export class example extends plugin {
    constructor() {
        super({
            name: '[iloli]戳别人',
            dsc: '戳别人',
            event: 'message',
            priority: 1,
            rule: [
                { reg: /^戳[他它她]?(\d+)?(次|下)?$/, fnc: 'Chuo' },
            ]
        });
    }

    async Chuo(e) {
        const match = e.msg.match(/^戳[他它她]?(\d+)?(次|下)?$/);
        if (!match) return false;

        // 获取次数，如果没有指定次数则默认为3
        const times = parseInt(match[1]) || 3;
        // 判断@用户
        if (!e.at) {
            e.reply('你都不@要戳的人我怎么戳');
            return false;
        }

        // 限制最大次数
        const maxTimes = 20; 
        const pokeTimes = Math.min(times, maxTimes);

        // 按照指定的次数戳用户
        for (let i = 0; i < pokeTimes; i++) {
            this.e.group.pokeMember(e.at);
        }

        return true;
    }
}
