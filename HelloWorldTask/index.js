const tl = require('azure-pipelines-task-lib/task');

async function run() {
    try {
        // Get input values
        const greeting = tl.getInput('greeting', true);
        const name = tl.getInput('name', true);
        
        // Display the greeting
        const message = `${greeting}, ${name}!`;
        console.log(message);
        
        // Set task result to succeeded
        tl.setResult(tl.TaskResult.Succeeded, message);
    }
    catch (err) {
        // Set task result to failed
        tl.setResult(tl.TaskResult.Failed, err.message);
    }
}

run();
