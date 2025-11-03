
> **Important:** This extension is not a replacement of official [Azure Synapse workspace deployment task](https://marketplace.visualstudio.com/items?itemName=AzureSynapseWorkspace.synapsecicd-deploy). At this moment, the official task does not support Workload Identity Federation (WIF). This extension aims to fill that gap by providing a task specifically designed for WIF scenarios. You can either install and run this extension alongside the official task or collect the source code and build your own extension for end-to-end control. There is also no official support for this extension from Microsoft. 


# Synapse Workspace Deployment with WIF

This extension provides a task for deploying Azure Synapse Workspaces using **Workload Identity Federation (WIF)**. Azure Synapse is an integrated analytics service that accelerates time to insight across data warehouses and big data systems. Azure Synapse brings together the best of SQL technologies used in enterprise data warehousing, Spark technologies used for big data, Pipelines for data integration and ETL/ELT, and deep integration with other Azure services such as Power BI, CosmosDB, and AzureML.

## Features

- Simplified deployment process for Azure Synapse Workspaces.
- Support for Workload Identity Federation (WIF) for enhanced security.
- Integration with Azure DevOps for seamless CI/CD workflows.
- Comprehensive logging and error handling for better troubleshooting.
- Support for multiple deployment environments (e.g., dev, test, prod).
- Extensibility for custom deployment scenarios.

## Synapse Workspace Deployment

Designed for synapse workspace artifacts deployment. You can use this extension to continuous delivery your synapse artifacts from one workspace to another.

## Getting started

Step1: Search and get the extension from Azure DevOps marketplace if you have installed the extension before, uninstall it first.

Step 2: Make sure Azure DevOps pipeline’s service principal has been granted the permission of subscription and also assigned as workspace admin for target workspace.

Step 3. Create a new task in the release pipeline stage. Search for Synapse workspace deployment, and then select Add.

Step 4: In the task, select next to the Template box to choose the template file.

Step 5: Select next to the Template parameters box to choose the parameters file.

Step 6: Select the connection, resource group, and name of the target workspace.

Step 7: Select next to the Override template parameters box, and enter the desired parameter values for the target workspace.

## Documentation and Help
Full documentation available on [synapse workspace continuous deployment](https://docs.microsoft.com/en-us/azure/synapse-analytics/cicd/continuous-integration-deployment).


## Support

For any issues or feature requests, please open an issue on the [GitHub repository](https://github.com/MoimHossain/Synapse-workspace-deployment-wif/issues). While we strive to address all inquiries, please note that there is no official support for this extension from Microsoft. 