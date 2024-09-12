import { exec } from 'child_process'

// https://stackoverflow.com/questions/61231106/why-is-my-exec-command-failing-but-works-if-the-command-is-passed-in-the-termina#61232030
export const execPromise = (cmd: string) => {
    return new Promise((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                if (error.code === 1) {
                    // leaks present
                    resolve(stdout)
                } else {
                    // gitleaks error
                    reject(error)
                }
            } else {
                // no leaks
                resolve(stdout)
            }
        })
    })
}
