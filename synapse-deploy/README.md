## Synapse workspace deployment task (WIF enabled)

This task now supports Azure DevOps service connections that use **Workload Identity Federation (WIF)**. When running with WIF:

- Enable **Allow scripts to access the OAuth token** on the pipeline so the task can request an Azure DevOps OIDC token at runtime.
- Run on an agent version `3.220.5` or newer (hosted agents already satisfy this) and ensure `System.AccessToken` is available.
- Configure the target Entra ID application with the federated credential that matches the service connection’s issuer and subject. The task exchanges a *fresh* OIDC token for each Azure request so no long-lived tokens are cached on disk.

Service principal (secret or certificate) and managed identity flows continue to work unchanged.
