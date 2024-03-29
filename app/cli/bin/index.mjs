#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import { program } from 'commander'
import chalk from 'chalk'
import figlet from 'figlet'
import clear from 'clear'
import { Octokit } from '@octokit/rest'
import { inquireRepositoryDetails, promptForGitHubToken } from "../src/tui/prompts.mjs"
import { initializeLocalRepository, commitInitialFiles, pushToGitWithToken } from "../src/utils/git.mjs"
import { createGitHubRepository } from "../src/utils/github.mjs"


let {GITHUB_TOKEN} = process.env
let GITHUB_USERNAME = 'github-username'
let octokit = null
let templatesFolder = '../../../templates'

function displayWelcomeMessage() {
    clear()
    console.log(chalk.yellow(figlet.textSync('SPINUP', { horizontalLayout: 'full' })))
    console.log(chalk.green('Spin up a new repo and app from template'))
}


function getRepositoryTemplateChoices() {
    const scriptPath = path.dirname(new URL(import.meta.url).pathname)

    const templatesPath = path.join(scriptPath, templatesFolder)
    const templateFolders = fs.readdirSync(templatesPath, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name)

    return templateFolders.map((folder) => {
        const words = folder.split('-')
        const capitalizedWords = words.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        return {
            name: capitalizedWords.join(' '),
            value: folder
        }
    })
}


async function copyTemplateFiles(templateName, destinationPath) {
    const scriptPath = path.dirname(new URL(import.meta.url).pathname)
    const templatePath = path.join(scriptPath, templatesFolder, templateName)

    try {
        await fs.promises.cp(templatePath, destinationPath, {
            recursive: true,
            filter: (src, dest) => !src.includes('.git'),
        })
        console.log(chalk.green('Template files copied successfully.'))
    } catch (error) {
        console.error('Error copying template files:', error)
    }
}

async function main(providedName) {
    displayWelcomeMessage()

    if (!GITHUB_TOKEN) {
        GITHUB_TOKEN = await promptForGitHubToken()
    }

    if (GITHUB_TOKEN) {
        try {
            octokit = new Octokit({ auth: GITHUB_TOKEN })
            const { data: user } = await octokit.users.getAuthenticated()
            GITHUB_USERNAME = user.login

            console.log(chalk.green(`Using GitHub Account: ${GITHUB_USERNAME}`))
            console.log(` `)
        } catch (error) {
            console.error(chalk.red('Error verifying GitHub credentials:'), error)
            process.exit(1)
        }
    }

    const templates = getRepositoryTemplateChoices()
    const { name, description, template, private: isPrivate } = await inquireRepositoryDetails(providedName, templates, GITHUB_USERNAME, octokit)

    console.log(' ')

    const templateName = template.toLowerCase().replace(' ', '-')
    await copyTemplateFiles(templateName, name)

    const remoteUrl = await createGitHubRepository(name, description, isPrivate, octokit)

    if (remoteUrl) {
        await initializeLocalRepository(name)
        await commitInitialFiles(name)
        await pushToGitWithToken(name, remoteUrl, GITHUB_TOKEN)

        console.log(chalk.green(`Repository created successfully: ${remoteUrl}`))
    } else {
        console.log(chalk.red('Failed to create repository.'))
    }
}


program
    .argument('[name]', 'Repository name')
    .description('Create a new GitHub repository')
    .action(async (name) => {
        try {
            await main(name)
        } catch (error) {
            console.error('An error occurred:', error)
            process.exit(1)
        }
    })

program.parse(process.argv)
//
// if (!process.argv.slice(2).length) {
//     main()
// }