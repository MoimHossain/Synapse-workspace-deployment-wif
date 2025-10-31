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
exports.GetHttpClient = exports.DefaultArtifact = exports.isDefaultArtifact = exports.isStrNullOrEmpty = void 0;
const artifacts_enum_1 = require("./artifacts_enum");
const httpClient = __importStar(require("typed-rest-client/HttpClient"));
const packagejson = require('./package.json');
function isStrNullOrEmpty(val) {
    if (val === undefined || val === null || val.trim() === '') {
        return true;
    }
    return false;
}
exports.isStrNullOrEmpty = isStrNullOrEmpty;
function isDefaultArtifact(artifact) {
    let artifactJson = JSON.parse(artifact);
    if (artifactJson.type == artifacts_enum_1.DataFactoryType.managedPrivateEndpoints)
        return DefaultArtifact.DefaultArtifacts.some((e) => e.matches(artifactJson.name, artifactJson.properties.groupId, artifactJson.type));
    return DefaultArtifact.DefaultArtifacts.some((e) => e.matches(artifactJson.name, artifactJson.properties.type, artifactJson.type));
    return false;
}
exports.isDefaultArtifact = isDefaultArtifact;
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
exports.GetHttpClient = GetHttpClient;
//# sourceMappingURL=CommonUtils.js.map