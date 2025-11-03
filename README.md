# Synapse-workspace-deployment-wif
Using workload Identity Federation for Synapse Workspace Deployment in Azure Pipelines

## Azure Pipeline Task Structure

This repository contains an Azure Pipeline task extension for deploying Synapse Workspaces using Workload Identity Federation.

### Extension Structure

```
.
├── vss-extension.json          # Extension manifest file
└── synapse-deploy/             # Synapse deployment task folder
    ├── task.json               # Task definition
    ├── index.js                # Task implementation
    ├── package.json            # Node.js dependencies
    └── README.md               # Task documentation
```

### Getting Started

1. **Install dependencies** for the task:
   ```bash
   cd synapse-deploy
   npm install
   ```

2. **Package the extension**:
   - Install tfx-cli: `npm install -g tfx-cli`
   - Package: `tfx extension create --manifest-globs vss-extension.json`

3. **Publish to Azure DevOps**:
   - Upload the generated `.vsix` file to the Azure DevOps marketplace

### Task Details

See the [synapse-deploy README](synapse-deploy/README.md) for specific task documentation.
