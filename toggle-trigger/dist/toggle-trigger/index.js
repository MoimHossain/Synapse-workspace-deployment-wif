"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const synapse_cicd_library_1 = require("@azure/synapse-cicd-library");
const ado = __importStar(require("azure-pipelines-task-lib"));
const logger_1 = require("../shared/logger");
const utils_1 = require("../shared/utils");
const debugEnabled = ado.getBoolInput("Debug");
class ToggleParams extends utils_1.TaskBaseParams {
    constructor() {
        super(...arguments);
        this.toggleOn = ado.getBoolInput("ToggleOn", true);
        this.triggerNames = ado.getInput("Triggers", true).split(",");
    }
}
synapse_cicd_library_1.toggleTriggersMainAsync(new ToggleParams(), new logger_1.TaskLogger(debugEnabled)).then(() => {
    ado.setResult(ado.TaskResult.Succeeded, "Refer to above logs for more details.");
}).catch((err) => {
    ado.setResult(ado.TaskResult.Failed, `Refer to above logs for more details.
        ${JSON.stringify(err)}`);
});
//# sourceMappingURL=index.js.map