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
exports.TaskBaseParams = void 0;
const synapse_cicd_library_1 = require("@azure/synapse-cicd-library");
const ado = __importStar(require("azure-pipelines-task-lib"));
class SynapseExtensionError {
    static UnsupportedAzureEnv(env) {
        return {
            code: "U0001",
            message: `The service connection is hosted in ${env} which is not supported by this task`
        };
    }
    static UnsupportedAuthScheme(authScheme) {
        return {
            code: "U002",
            message: `The service connection authScheme ${authScheme} is not supported by this task`
        };
    }
}
function getAzureEnvironment(env) {
    switch (env.trim().toLowerCase()) {
        case "azurecloud":
            return synapse_cicd_library_1.SupportedAzureEnvironments.PublicCloud;
        case "azureusgovernment":
            return synapse_cicd_library_1.SupportedAzureEnvironments.AzureUSGovernment;
        default:
            throw SynapseExtensionError.UnsupportedAzureEnv(env);
    }
}
function getAuthType(authScheme) {
    switch (authScheme.trim().toLowerCase()) {
        case "serviceprincipal":
            return synapse_cicd_library_1.AuthType.SPN;
        case "managedserviceidentity":
            return synapse_cicd_library_1.AuthType.VmMsi;
        default:
            throw SynapseExtensionError.UnsupportedAuthScheme(authScheme);
    }
}
class TaskBaseParams {
    constructor() {
        this.serviceConnectionName = ado.getInput("ServiceConnectionName", true);
    }
    get servicePrincipalId() {
        return ado.getEndpointAuthorizationParameter(this.serviceConnectionName, "serviceprincipalid", true);
    }
    get servicePrincipalKey() {
        return ado.getEndpointAuthorizationParameter(this.serviceConnectionName, "serviceprincipalkey", true);
    }
    get tenantId() {
        return ado.getEndpointAuthorizationParameter(this.serviceConnectionName, "tenantid", false);
    }
    get azureEnvironment() {
        return getAzureEnvironment(ado.getEndpointDataParameter(this.serviceConnectionName, "environment", true));
    }
    get workspaceName() {
        return ado.getInput("WorkspaceName", true);
    }
    get resourceGroupName() {
        return ado.getInput("ResourceGroupName", true);
    }
    get subscriptionId() {
        return ado.getEndpointDataParameter(this.serviceConnectionName, "subscriptionId", false);
    }
    get authType() {
        return getAuthType(ado.getEndpointAuthorizationScheme(this.serviceConnectionName, true));
    }
}
exports.TaskBaseParams = TaskBaseParams;
//# sourceMappingURL=utils.js.map