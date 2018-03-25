'use strict';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import Base from '../base';
import Terminal from '../helpers/terminal-helper';


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
        tools: { ampy: "" }
      };

      // check build tools
      try {
        let ampyPath = await Terminal.execPromise("which ampy");
        configFileObject.tools.ampy = (ampyPath as string || '').trim();
      } catch (commandNotFoundException) {  }
      
      if (!configFileObject.tools.ampy || !configFileObject.tools.ampy.length || !fs.existsSync(configFileObject.tools.ampy)) {
        if (await vscode.window.showInformationMessage(
          "`ampy` command not found in your executable environment. Do you want to install `ampy` tool?",
          { modal: false },
          "No",
          "Install"
        ) === "Install") {
          try {
            this.statusText("Installing adafruit-ampy via pip...");
            let installResult = await Terminal.execPromise("pip install adafruit-ampy");
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
            let ampyPath = await Terminal.execPromise("which ampy");
            configFileObject.tools.ampy = (ampyPath as string || '').trim();
          } catch (commandNotFoundException) {  }
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
   * check and push editing document into device
   * then run main.py script (restart device also)
   */
  public buildActiveDocumentThenRun() {

  }

}
