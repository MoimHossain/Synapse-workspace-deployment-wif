"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportConstants = exports.OPERATIONS = exports.DeploymentConstants = exports.DEFAULT_ARTIFACTS_TYPE = exports.DEFAULT_ARTIFACTS = exports.DataFactoryType = exports.Artifact = void 0;
var Artifact;
(function (Artifact) {
    Artifact["notebook"] = "notebook";
    Artifact["sparkjobdefinition"] = "sparkJobDefinition";
    Artifact["sqlscript"] = "sqlScript";
    Artifact["dataset"] = "dataset";
    Artifact["pipeline"] = "pipeline";
    Artifact["trigger"] = "trigger";
    Artifact["dataflow"] = "dataflow";
    Artifact["linkedservice"] = "linkedService";
    Artifact["integrationruntime"] = "integrationRuntime";
    Artifact["credential"] = "credential";
    Artifact["sqlpool"] = "sqlpool";
    Artifact["bigdatapools"] = "bigdatapools";
    Artifact["managedvirtualnetworks"] = "managedVirtualNetworks";
    Artifact["managedprivateendpoints"] = "managedPrivateEndpoints";
    Artifact["kqlScript"] = "kqlScript";
    Artifact["database"] = "database";
    Artifact["sparkconfiguration"] = "sparkConfiguration";
})(Artifact = exports.Artifact || (exports.Artifact = {}));
var DataFactoryType;
(function (DataFactoryType) {
    DataFactoryType["dataset"] = "Microsoft.Synapse/workspaces/datasets";
    DataFactoryType["dataflow"] = "Microsoft.Synapse/workspaces/dataflows";
    DataFactoryType["linkedservice"] = "Microsoft.Synapse/workspaces/linkedServices";
    DataFactoryType["credential"] = "Microsoft.Synapse/workspaces/credentials";
    DataFactoryType["integrationruntime"] = "Microsoft.Synapse/workspaces/integrationRuntimes";
    DataFactoryType["notebook"] = "Microsoft.Synapse/workspaces/notebooks";
    DataFactoryType["pipeline"] = "Microsoft.Synapse/workspaces/pipelines";
    DataFactoryType["sparkjobdefinition"] = "Microsoft.Synapse/workspaces/sparkJobDefinitions";
    DataFactoryType["bigdatapools"] = "Microsoft.Synapse/workspaces/bigDataPools";
    DataFactoryType["sqlscript"] = "Microsoft.Synapse/workspaces/sqlscripts";
    DataFactoryType["trigger"] = "Microsoft.Synapse/workspaces/triggers";
    DataFactoryType["sqlpool"] = "Microsoft.Synapse/workspaces/sqlPools";
    DataFactoryType["managedVirtualNetworks"] = "Microsoft.Synapse/workspaces/managedVirtualNetworks";
    DataFactoryType["managedPrivateEndpoints"] = "Microsoft.Synapse/workspaces/managedVirtualNetworks/managedPrivateEndpoints";
    DataFactoryType["kqlScript"] = "Microsoft.Synapse/workspaces/kqlscripts";
    DataFactoryType["database"] = "Microsoft.Synapse/workspaces/databases";
    DataFactoryType["sparkconfiguration"] = "Microsoft.Synapse/workspaces/sparkConfigurations";
})(DataFactoryType = exports.DataFactoryType || (exports.DataFactoryType = {}));
var DEFAULT_ARTIFACTS;
(function (DEFAULT_ARTIFACTS) {
    DEFAULT_ARTIFACTS["sqlserver"] = "workspacedefaultsqlserver";
    DEFAULT_ARTIFACTS["storage"] = "workspacedefaultstorage";
    DEFAULT_ARTIFACTS["credentials"] = "workspacesystemidentity";
})(DEFAULT_ARTIFACTS = exports.DEFAULT_ARTIFACTS || (exports.DEFAULT_ARTIFACTS = {}));
var DEFAULT_ARTIFACTS_TYPE;
(function (DEFAULT_ARTIFACTS_TYPE) {
    DEFAULT_ARTIFACTS_TYPE["sqlserver"] = "AzureSqlDW";
    DEFAULT_ARTIFACTS_TYPE["storage"] = "AzureBlobFS";
    DEFAULT_ARTIFACTS_TYPE["credentials"] = "ManagedIdentity";
})(DEFAULT_ARTIFACTS_TYPE = exports.DEFAULT_ARTIFACTS_TYPE || (exports.DEFAULT_ARTIFACTS_TYPE = {}));
class DeploymentConstants {
}
exports.DeploymentConstants = DeploymentConstants;
DeploymentConstants.GetMSIUrl = "http://169.254.169.254/metadata/identity/oauth2/token";
DeploymentConstants.GetMSIAPIVersion = "2018-02-01";
var OPERATIONS;
(function (OPERATIONS) {
    OPERATIONS["deploy"] = "deploy";
    OPERATIONS["validate"] = "validate";
    OPERATIONS["export"] = "export";
    OPERATIONS["validateDeploy"] = "validateDeploy";
})(OPERATIONS = exports.OPERATIONS || (exports.OPERATIONS = {}));
var ExportConstants;
(function (ExportConstants) {
    ExportConstants["destinationFolder"] = "ExportedArtifacts";
    ExportConstants["templateFile"] = "TemplateForWorkspace.json";
    ExportConstants["parameterFile"] = "TemplateParametersForWorkspace.json";
})(ExportConstants = exports.ExportConstants || (exports.ExportConstants = {}));
//# sourceMappingURL=artifacts_enum.js.map