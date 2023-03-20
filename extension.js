const vscode = require("vscode");
const path = require("path");

async function selectEnvironmentUrl() {
  const config = vscode.workspace.getConfiguration();
  const environments = config.get("appPeek.environments") || [];

  if (environments.length === 0) {
    vscode.window.showErrorMessage(
      "No environments are configured. Please check your settings."
    );
    return null;
  }

  const items = environments.map((environment) => ({
    label: environment.name,
    environment: environment,
  }));

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: "Select an environment to peek",
  });

  return selected ? selected.environment : null;
}

// Register the new command
const addAddEnvironmentCommand = (context) => {
  vscode.commands.registerCommand("apppeek.addEnvironment", async () => {
    // Prompt the user for environment name and URL
    const name = await vscode.window.showInputBox({
      prompt: "Usually Prod, Dev, Staging or QA.",
      placeHolder: "What's the name of the environment? ",
    });
    if (!name) return;

    const config = vscode.workspace.getConfiguration("appPeek");
    const environments = config.get("environments") || [];
    const environment = { name, url };
    const isDuplicatedEnvironment = environments.find(
      ({ name }) => name === environment.name
    );

    if (isDuplicatedEnvironment) {
      vscode.window.showErrorMessage(`Environment ${name} already exists.`);
      return;
    }

    const url = await vscode.window.showInputBox({
      prompt: "Enter environment URL.",
      value: "https://",
    });
    if (!url) return;

    // Add the new environment
    environments.push(environment);

    // Update and save the configuration
    await config.update(
      "environments",
      environments,
      vscode.ConfigurationTarget.Global
    );

    // Show a confirmation message
    vscode.window.showInformationMessage(`Environment "${name}" added.`);
    openWebView(context, environment);
  });

  context.subscriptions.push(addAddEnvironmentCommand);
};

const addPeekCommand = (context) => {
  let disposable = vscode.commands.registerCommand(
    "apppeek.openAppPeek",
    async () => {
      try {
        await openAppPeek(context);
      } catch (error) {
        vscode.window.showErrorMessage(
          "Error opening preview: " + error.message
        );
      }
    }
  );

  context.subscriptions.push(disposable);
};

function createWebviewPanel() {
  return vscode.window.createWebviewPanel(
    "appPeek",
    "",
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    }
  );
}

function setWebviewPanelIcon(panel, context) {
  const iconPath = vscode.Uri.file(
    path.join(context.extensionPath, "app-peek-icon.png")
  );
  panel.iconPath = iconPath;
}

function setWebviewPanelContent(panel, url) {
  panel.webview.html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src *; img-src * 'self' data: http: https:; style-src 'unsafe-inline' *; script-src 'unsafe-inline' *;">
        <title>AppPeek</title>
        <style>
          body, html {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            background-color: white;
          }
          iframe {
            position: absolute;
            top: 30px;
            left: 0;
            width: 100%;
            height: calc(100% - 30px);
            border: none;
          }
        </style>
      </head>
      <body>
        <iframe id="main-iframe" src="${url}"></iframe>
      </body>
    </html>`;
}

const openWebView = (context, environment) => {
  const { name, url } = environment;
  const panel = createWebviewPanel();
  panel.title = `[${name}]`;

  setWebviewPanelIcon(panel, context);
  setWebviewPanelContent(panel, url);
};

async function openAppPeek(context) {
  try {
    const environment = await selectEnvironmentUrl();
    if (!environment) {
      return;
    }
    openWebView(context, environment);
  } catch (error) {
    vscode.window.showErrorMessage("Error opening AppPeek: " + error.message);
  }
}

async function selectEnvironment() {
  const config = vscode.workspace.getConfiguration();
  const environments = config.get("appPeek.environments") || [];

  if (environments.length === 0) {
    vscode.window.showErrorMessage(
      "No environments are configured. Please check your settings."
    );
    return null;
  }

  const items = environments.map((environment) => ({
    label: environment.name,
    environment: environment,
  }));

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: "Select an environment",
  });

  return selected ? selected.environment : null;
}

async function editEnvironment() {
  const environment = await selectEnvironment();
  if (!environment) {
    return;
  }

  const name = await vscode.window.showInputBox({
    prompt: "Usually Prod, Dev, Staging or QA.",
    placeHolder: "What's the new name of the environment?",
    value: environment.name,
  });
  if (!name) return;

  const url = await vscode.window.showInputBox({
    prompt: "Enter new environment URL.",
    value: environment.url,
  });
  if (!url) return;

  const config = vscode.workspace.getConfiguration("appPeek");
  const environments = config.get("environments") || [];

  const index = environments.findIndex((env) => env.name === environment.name);

  if (index >= 0) {
    environments[index] = { name, url };

    await config.update(
      "environments",
      environments,
      vscode.ConfigurationTarget.Global
    );

    vscode.window.showInformationMessage(`Environment "${name}" updated.`);
  } else {
    vscode.window.showErrorMessage("Environment not found.");
  }
}

async function deleteEnvironment() {
  const environment = await selectEnvironment();
  if (!environment) {
    return;
  }

  const config = vscode.workspace.getConfiguration("appPeek");
  const environments = config.get("environments") || [];

  const updatedEnvironments = environments.filter(
    (env) => env.name !== environment.name
  );

  await config.update(
    "environments",
    updatedEnvironments,
    vscode.ConfigurationTarget.Global
  );

  vscode.window.showInformationMessage(
    `Environment "${environment.name}" deleted.`
  );
}

function addEditEnvironmentCommand(context) {
  const disposable = vscode.commands.registerCommand(
    "apppeek.editEnvironment",
    async () => {
      try {
        await editEnvironment(context);
      } catch (error) {
        vscode.window.showErrorMessage(
          "Error editing environment: " + error.message
        );
      }
    }
  );
  context.subscriptions.push(disposable);
}

function addDeleteEnvironmentCommand(context) {
  const disposable = vscode.commands.registerCommand(
    "apppeek.deleteEnvironment",
    async () => {
      try {
        await deleteEnvironment();
      } catch (error) {
        vscode.window.showErrorMessage(
          "Error deleting environment: " + error.message
        );
      }
    }
  );
  context.subscriptions.push(disposable);
}

function activate(context) {
  addAddEnvironmentCommand(context);
  addPeekCommand(context);
  addEditEnvironmentCommand(context);
  addDeleteEnvironmentCommand(context);
}

exports.activate = activate;

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
