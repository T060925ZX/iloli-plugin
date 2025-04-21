import Cfg from '../model/Cfg.js'
const config = Cfg.getConfig('config');
const Summary = config.summary;

segment.image = function (file, name) {
    return {
        type: "image",
        file: file,
        name: name,
        summary: Summary 
    };
};
