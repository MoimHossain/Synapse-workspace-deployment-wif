const area: string = "TaskDeploymentMethod";
const feature: string = "synapse-deployment-task";

export function logTelemetry(payload: any): void {
    console.log(`##vso[telemetry.publish area=${area};feature=${feature}]` +JSON.stringify(payload));
}