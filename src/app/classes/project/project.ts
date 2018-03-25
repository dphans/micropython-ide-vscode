'use strict';
import Base from '../base';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';


export default class Project extends Base {

  /**
   * display main menu for project managerment
   */
  public async showMainMenu() {
    let menuItems: vscode.QuickPickItem[] = [];
    menuItems.push({
      label: "New project...",
      description: "",
      detail: "Generate new project included supported files"
    });

    let selectedAction = await vscode.window.showQuickPick(menuItems);
    if (!selectedAction) { return; }

    switch (selectedAction.label) {
      case 'New project...':
        this.actionNewProject();
        break;
    }
  }

  /**
   * start new project setup widzard
   */
  public async actionNewProject() {
    try {
      let selectedFolder = await vscode.window.showOpenDialog({
        openLabel: "Create...",
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false
      });
      if (!selectedFolder) { this.statusDone(); return; }
      if (!selectedFolder.length) { this.statusDone(); return; }

      let projectName   = await vscode.window.showInputBox({
        ignoreFocusOut: true,
        placeHolder: "My Project",
        prompt: "Name of your project...",
        validateInput(value: string) {
          return (value.match(/^[^\\/:\*\?"<>\|]+$/) || '') ? null : 'The following characters are not allowed: \ / : * ? \" < > |';
        }
      });
  
      if (!projectName || !projectName.length) {
        this.statusDone();
        return;
      }

      let workingFolder = path.join(selectedFolder[0].fsPath, projectName);
      let configFile    = path.join(workingFolder, Base.CONSTANTS.APP.CONFIG_FILE_NAME);

      // find connected ports
      var selectedPort: string = '';
      switch (this.getUserPlatform()) {
        case 'win32':
          selectedPort = await vscode.window.showInputBox({
            ignoreFocusOut: true,
            placeHolder: 'COM1',
            prompt: "Current, we are not support auto detect devices connected for Windows. You need to enter port manually."
          }) || '';
          break;
        default:
          selectedPort = '> Reload list';
          while (selectedPort === '> Reload list') {
            var serialPorts: string[] = [];
            try {
              fs.readdirSync('/dev/').forEach((portItem) => {
                if (portItem.startsWith('tty.') && portItem.length >= 15) {
                  serialPorts.push('/dev/' + portItem);
                }
              });
            } catch (exception) {
              serialPorts = [];
              this.reportException(exception);
            } finally {
              serialPorts.push('> Reload list');
              serialPorts.push('> Not listed above?');
            }
            selectedPort = await vscode.window.showQuickPick(serialPorts, {
              ignoreFocusOut: true,
              placeHolder: "Please select port of connected device."
            }) || '';
          }
          if (selectedPort === "> Not listed above?") {
            selectedPort = await vscode.window.showInputBox({
              ignoreFocusOut: true,
              prompt: "Please enter port manually."
            }) || '';
          }
          break;
      }

      if (!selectedPort || !selectedPort.length) {
        this.statusDone();
        return;
      }

      if (!fs.existsSync(selectedPort)) {
        vscode.window.showErrorMessage("Port not exist, please connect device and try again!");
        this.statusDone();
        return;
      }

      let selectedBaudRate = parseInt(await vscode.window.showQuickPick([
        "300", "600", "1200", "2400", "4800", "9600", "14400", "19200", "28800", "38400", "57600", "115200", "128000", "256000"
      ], {
        ignoreFocusOut: true,
        placeHolder: "Please select default baud rate, default is 115200."
      }) || '115200') || 115200;

      // content of micropython config file
      let configFileObject = {
        upload: { port: selectedPort, baud: selectedBaudRate },
        serial: { port: selectedPort, baud: selectedBaudRate },
        ignore: { extensions: [Base.CONSTANTS.APP.CONFIG_FILE_NAME], directories: [".vscode"] },
        tools: { ampy: "", rshell: "" }
      };

      // check build tools
      try {
        let ampyPath = await Base.getTerminalHelper().execPromise("which ampy");
        configFileObject.tools.ampy = (ampyPath as string || '').trim();
      } catch (commandNotFoundException) {
        this.reportException(commandNotFoundException);
      }
      
      if (!configFileObject.tools.ampy || !configFileObject.tools.ampy.length || !fs.existsSync(configFileObject.tools.ampy)) {
        if (await vscode.window.showInformationMessage(
          "`ampy` command not found in your executable environment. Do you want to install `ampy` tool?",
          { modal: false },
          "No",
          "Install"
        ) === "Install") {
          try {
            this.statusText("Installing adafruit-ampy via pip...");
            let installResult = await Base.getTerminalHelper().execPromise("pip install adafruit-ampy");
            this.outputClear();
            this.outputPrintLn((installResult || '') as string);
            this.outputShown(true);
          } catch (installAmpyException) {
            this.reportException(installAmpyException);
          } finally {
            this.outputShown(false);
            this.statusDone();
          }
          try {
            let ampyPath = await Base.getTerminalHelper().execPromise("which ampy");
            configFileObject.tools.ampy = (ampyPath as string || '').trim();
          } catch (commandNotFoundException) {
            this.reportException(commandNotFoundException);
          }
        }
      }

      try {
        let rshellPath = await Base.getTerminalHelper().execPromise("which rshell");
        configFileObject.tools.rshell = (rshellPath as string || '').trim();
      } catch (commandNotFoundException) {
        this.reportException(commandNotFoundException);
      }
      
      if (!configFileObject.tools.rshell || !configFileObject.tools.rshell.length || !fs.existsSync(configFileObject.tools.rshell)) {
        if (await vscode.window.showInformationMessage(
          "`rshell` command not found in your executable environment. Do you want to install `rshell` tool?",
          { modal: false },
          "No",
          "Install"
        ) === "Install") {
          try {
            this.statusText("Installing rshell via pip...");
            let installResult = await Base.getTerminalHelper().execPromise("pip install rshell");
            this.outputClear();
            this.outputPrintLn((installResult || '') as string);
            this.outputShown(true);
          } catch (installRshellException) {
            this.reportException(installRshellException);
          } finally {
            this.outputShown(false);
            this.statusDone();
          }
          try {
            let rshellPath = await Base.getTerminalHelper().execPromise("which rshell");
            configFileObject.tools.ampy = (rshellPath as string || '').trim();
          } catch (commandNotFoundException) {
            this.reportException(commandNotFoundException);
          }
        }
      }

      fs.mkdirSync(workingFolder);
      fs.writeFileSync(path.join(workingFolder, "boot.py"), "# This is script that run when device boot up or wake from sleep.\n\n\n");
      fs.writeFileSync(path.join(workingFolder, "main.py"), "# This is your main script.\n\n\nprint(\"Hello, world!\")\n");
      fs.writeFileSync(configFile, JSON.stringify(configFileObject, null, 2));
      await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.parse(workingFolder));
    } catch (exception) {
      vscode.window.showErrorMessage("Error while preparing new project: " + (exception as Error).message);
      this.reportException(exception);
    } finally {
      this.statusDone();
    }
  }

  /**
   * check and push document into device
   * then run main.py script (restart device also)
   */
  public async buildDocumentThenRun() {
    if (!vscode.window.activeTextEditor) {
      vscode.window.showErrorMessage("No active editor can run in this time, please switch to your working file to run!");
      return;
    }

    let documentUri = vscode.window.activeTextEditor.document.uri;

    if (!(await Base.getTerminalHelper().checkExecutableToolPromise("ampy", "pip install adafruit-ampy"))) {
      vscode.window.showErrorMessage("Required tool not found (`ampy`). Please install `ampy` to run project.");
      return;
    }

    if (!(await Base.getTerminalHelper().checkExecutableToolPromise("rshell", "pip install rshell"))) {
      vscode.window.showErrorMessage("Required tool not found (`rshell`). Please install `rshell` to run project.");
      return;
    }

    try {
      let projectConfig = this.getProjectConfig();
      if (typeof projectConfig !== 'object') {
        vscode.window.showErrorMessage("Error while reading settings from Micropython config file (`" + Base.CONSTANTS.APP.CONFIG_FILE_NAME + "`). Please recheck config file!");
        return;
      }

      let ampyExecutePath = ((projectConfig || {}).tools || {}).ampy || '';
      if (!ampyExecutePath || !ampyExecutePath.length) {
        vscode.window.showErrorMessage("Error while reading `ampy` execuable path. Please recheck `tools.ampy` setting inside Micropython config file (`" + Base.CONSTANTS.APP.CONFIG_FILE_NAME + "`) then try again!");
        return;
      }

      let rshellExecutePath = ((projectConfig || {}).tools || {}).rshell || '';
      if (!rshellExecutePath || !rshellExecutePath.length) {
        vscode.window.showErrorMessage("Error while reading `rshell` execuable path. Please recheck `tools.rshell` setting inside Micropython config file (`" + Base.CONSTANTS.APP.CONFIG_FILE_NAME + "`) then try again!");
        return;
      }

      let uploadPort = ((projectConfig || {}).upload || {}).port || '';
      if (!ampyExecutePath || !ampyExecutePath.length) {
        vscode.window.showErrorMessage("Error while reading `port`. Please recheck `upload.port` setting inside Micropython config file (`" + Base.CONSTANTS.APP.CONFIG_FILE_NAME + "`) then try again!");
        return;
      }

      let projectRoot = vscode.workspace.getWorkspaceFolder(documentUri);
      if (!projectRoot) {
        vscode.window.showErrorMessage("Cannot find project directory!");
        return;
      }

      let uploadBaud = ((projectConfig || {}).upload || {}).baud || 115200;
      let documentPath = documentUri.fsPath.split(' ').join('\\ ');

      // kill current terminal process to skip busy port if available
      try { await this.terminalKillCurrentProcess(); } catch (e) { /* no such process */ }

      let ampyCommandPrefix = ampyExecutePath + " --port " + uploadPort + " --baud " + uploadBaud + " ";

      // split path components of current document, to create child path if needed
      // create paths if needed
      let pathComponents = documentUri.fsPath.replace(projectRoot.uri.fsPath, '').replace('/' + path.basename(documentUri.fsPath), '').split('/');
      var pathComponentCurrent = "";
      for (var pathIndex: number = 0; pathIndex < pathComponents.length; pathIndex++) {
        if (pathComponents[pathIndex].length) {
          pathComponentCurrent += "/" + pathComponents[pathIndex];
          this.statusText("Creating directory `" + pathComponentCurrent + "`");
          try { await Base.getTerminalHelper().execPromise(ampyCommandPrefix + "mkdir " + pathComponentCurrent); } catch (e) { /* directory already exist */ }
        }
      }

      // send current active document into device
      this.statusText("Sending file `" + path.basename(documentPath) + "`...");
      await Base.getTerminalHelper().execPromise(ampyCommandPrefix + "put " + documentPath + " " + pathComponentCurrent + "/" + path.basename(documentPath));
      this.statusDone();
      vscode.window.showInformationMessage("`" + path.basename(documentPath) + "` has been sent to device successfully!");

      // show terminal window in rshell mode
      this.terminalWrite(rshellExecutePath + " --port " + uploadPort + " --baud " + uploadBaud + " repl");
    } catch (executeException) {
      this.log(executeException);
    }
  }

  /**
   * find micropython config file
   * @returns content of config file as json object, or null if not available
   */
  public getProjectConfig() {
    if (!vscode.workspace.rootPath) { return null; }
    let configFilePath = path.join(vscode.workspace.rootPath, Base.CONSTANTS.APP.CONFIG_FILE_NAME);
    if (!fs.existsSync(configFilePath)) { return null; }
    try {
      let configContent = fs.readFileSync(configFilePath);
      return JSON.parse(configContent.toString());
    } catch (fileReadException) {
      this.reportException(fileReadException);
      return null;
    }
  }

}
