"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultArtifact = void 0;
exports.isStrNullOrEmpty = isStrNullOrEmpty;
exports.isDefaultArtifact = isDefaultArtifact;
exports.GetHttpClient = GetHttpClient;
const artifacts_enum_1 = require("./artifacts_enum");
const httpClient = __importStar(require("typed-rest-client/HttpClient"));
const packagejson = require('./package.json');
function isStrNullOrEmpty(val) {
    if (val === undefined || val === null || val.trim() === '') {
        return true;
    }
    return false;
}
function isDefaultArtifact(artifact) {
    let artifactJson = JSON.parse(artifact);
    if (artifactJson.type == artifacts_enum_1.DataFactoryType.managedPrivateEndpoints)
        return DefaultArtifact.DefaultArtifacts.some((e) => e.matches(artifactJson.name, artifactJson.properties.groupId, artifactJson.type));
    return DefaultArtifact.DefaultArtifacts.some((e) => e.matches(artifactJson.name, artifactJson.properties.type, artifactJson.type));
    return false;
}
class DefaultArtifact {
    constructor(name, type, dataFactoryType) {
        this.name = name;
        this.type = type;
        this.dataFactoryType = dataFactoryType;
    }
    matches(name, type, dataFactoryType) {
        return name.toLowerCase().includes(this.name.toLowerCase())
            && type.toLowerCase() === this.type.toLowerCase()
            && dataFactoryType.toLowerCase() === this.dataFactoryType.toLowerCase();
    }
}
exports.DefaultArtifact = DefaultArtifact;
DefaultArtifact.DefaultArtifacts = [
    new DefaultArtifact("workspacedefaultsqlserver", "azuresqldw", artifacts_enum_1.DataFactoryType.linkedservice),
    new DefaultArtifact("workspacedefaultstorage", "azureblobfs", artifacts_enum_1.DataFactoryType.linkedservice),
    new DefaultArtifact("workspacesystemidentity", "managedidentity", artifacts_enum_1.DataFactoryType.credential),
    new DefaultArtifact("synapse-ws-sql", "sql", artifacts_enum_1.DataFactoryType.managedPrivateEndpoints),
    new DefaultArtifact("synapse-ws-sqlOnDemand", "sqlOnDemand", artifacts_enum_1.DataFactoryType.managedPrivateEndpoints),
    new DefaultArtifact("synapse-ws-kusto", "Kusto", artifacts_enum_1.DataFactoryType.managedPrivateEndpoints),
];
function GetHttpClient() {
    const userAgent = 'synapse-cicd-deploy-task-' + packagejson.version;
    const requestOptions = {
        ignoreSslError: true,
        socketTimeout: 0
    };
    process.env.NODE_OPTIONS = "--tls-min-v1.2";
    return new httpClient.HttpClient(userAgent, undefined, requestOptions);
}
//# sourceMappingURL=CommonUtils.js.map