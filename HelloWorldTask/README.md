# Hello World Task

A simple hello world Azure Pipeline task that demonstrates the basic structure of an Azure DevOps extension.

## Overview

This task takes two inputs:
- **Greeting**: The greeting to display (default: "Hello")
- **Name**: The name to greet (default: "World")

And outputs: "{Greeting}, {Name}!"

## Usage

To use this task in your pipeline:

```yaml
- task: HelloWorldTask@0
  inputs:
    greeting: 'Hello'
    name: 'World'
```

## Development

To build and test this task locally:

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the task:
   ```bash
   node index.js
   ```

## Task Structure

- `task.json` - Task manifest file that defines the task metadata, inputs, and execution details
- `index.js` - Main task implementation
- `package.json` - Node.js package configuration with dependencies
