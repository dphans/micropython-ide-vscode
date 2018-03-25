'use strict';
import * as child_process from 'child_process';


export default new class TerminalHelper {

  execPromise(command: string) {
    return new Promise((resolve, reject) => {
      child_process.exec(command, (error, stdout, stderr) => {
        if (error) {
          return reject(error);
        }
        return resolve(stdout);
      });
    });
  }

};
