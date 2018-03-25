'use strict';
import * as child_process from 'child_process';
import { window, workspace } from 'vscode';


export default new class TerminalHelper {

  public execPromise(command: string) {
    return new Promise((resolve, reject) => {
      // Fix parsing args child_process library for python3
      // TODO: Remove line below when owner fixed this problem (reference: https://github.com/madjar/nox/issues/19)
      command = "export LANG=\"en_US.UTF-8\" && " + command;
      child_process.exec(command, {
        encoding: 'utf8',
        cwd: workspace.rootPath
      }, (error, stdout, stderr) => {
        if (error) {
          return reject(error);
        }
        return resolve(stdout);
      });
    });
  }

  /**
   * kill process by process id
   * @param processId id of process
   * @param delayTimeMillis after process killed, delay this time
   */
  public killProcessPromise(processId: number, delayTimeMillis: number = 1000) {
    return new Promise(async (resolve, reject) => {
      try {
        await this.execPromise("kill -9 " + processId);
        setTimeout(() => {
          resolve(true);
        }, delayTimeMillis);
      } catch (executeException) {
        reject(executeException);
      }
    });
  }

  public checkExecutableToolPromise(executeCommandName: string, installScript: string) {
    return new Promise(async (resolve, reject) => {
      try {
        let toolPath = await this.getExecutableToolPathPromise(executeCommandName);
        if ((toolPath || '') as string === "") { throw new Error("Build tool is not available"); }
        resolve(true);
      } catch (commandNotFoundException) {
        if (await window.showInformationMessage(
          "`" + executeCommandName + "` command not found in your executable environment. Do you want to install `" + executeCommandName + "` tool?",
          { modal: false },
          "No",
          "Install"
        ) === "Install") {
          try {
            await this.execPromise(installScript);
          } catch (installAmpyException) {
            window.showErrorMessage("Error while installing `" + executeCommandName + "`, please recheck your internet connection and try again!");
          } finally {
            try {
              let isAvailable = await this.getExecutableToolPathPromise(executeCommandName) !== '';
              if (isAvailable) {
                window.showInformationMessage("`" + executeCommandName + "` has been installed successfully!");
              }
              resolve(isAvailable);
            } catch (e) {
              resolve(false);
            }
          }
        } else {
          resolve(false);
        }
      }
    });
  }

  public getExecutableToolPathPromise(executeCommandName: string) {
    return new Promise(async (resolve, reject) => {
      try {
        let toolPath = await this.execPromise("which " + executeCommandName);
        if (typeof toolPath !== "string") { toolPath = ''; }
        resolve((toolPath as string).trim());
      } catch (toolPathNotFound) {
        reject(toolPathNotFound);
      }
    });
  }

};
