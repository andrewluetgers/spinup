import simpleGit from 'simple-git'
import chalk from 'chalk'
export async function initializeLocalRepository(path) {
    const git = simpleGit(path)

    try {
        await git.init()
        console.log(chalk.green('Local Git repository initialized.'))
    } catch (error) {
        console.error('Error initializing local Git repository:', error)
    }
}

export async function commitInitialFiles(path) {
    const git = simpleGit(path)

    try {
        await git.add('./*')
        await git.commit('Initial commit')
        console.log(chalk.green('Initial files committed.'))
    } catch (error) {
        console.error('Error committing initial files:', error)
    }
}

export async function pushToGitWithToken(path, remoteUrl, token) {
    const git = simpleGit(path)

    try {
        // Modify the clone URL to include the token for authentication
        const remoteUrlWithToken = remoteUrl.replace('https://', `https://${token}:x-oauth-basic@`)
        await git.addRemote('origin', remoteUrlWithToken)
        await git.push('origin', 'main')
        console.log(chalk.green('Repository pushed to GitHub.'))
    } catch (error) {
        console.error('Error pushing to GitHub:', error)
    }
}