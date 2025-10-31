"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskLogger = void 0;
class TaskLogger {
    constructor(debugEnabled) {
        this.debugEnabled = debugEnabled;
    }
    info(message) {
        console.log(message);
        return message;
    }
    warn(message) {
        console.warn(message);
        return message;
    }
    error(message) {
        console.error(message);
        return message;
    }
    debug(message) {
        if (this.debugEnabled) {
            console.log(message);
        }
        return message;
    }
}
exports.TaskLogger = TaskLogger;
;
//# sourceMappingURL=logger.js.map