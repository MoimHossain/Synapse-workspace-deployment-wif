"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logTelemetry = void 0;
const area = "TaskDeploymentMethod";
const feature = "synapse-deployment-task";
function logTelemetry(payload) {
    console.log(`##vso[telemetry.publish area=${area};feature=${feature}]` + JSON.stringify(payload));
}
exports.logTelemetry = logTelemetry;
//# sourceMappingURL=telemetry.js.map