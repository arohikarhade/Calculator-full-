const fileLogger = require("./fileLogger");

let logger = null;

if (process.env.NODE_ENV !== 'production') {
    logger = fileLogger();
}

module.exports = logger;