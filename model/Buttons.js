export default class Button {
    ability() {
        return segment.button([
            { text: "我的超能力", callback: `#随机超能力` },
        ], [
            { text: "新增超能力", input: `#新增超能力` },
            { text: "新增副作用", input: `#新增副作用` },
        ])
    }

}