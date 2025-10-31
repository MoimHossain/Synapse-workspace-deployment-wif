"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logTelemetry = logTelemetry;
const area = "TaskDeploymentMethod";
const feature = "synapse-deployment-task";
function logTelemetry(payload) {
    console.log(`##vso[telemetry.publish area=${area};feature=${feature}]` + JSON.stringify(payload));
}
//# sourceMappingURL=telemetry.js.map