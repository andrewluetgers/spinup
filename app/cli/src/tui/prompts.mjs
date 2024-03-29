import chalk from "chalk"
import enq from 'enquirer';
import { isValidName, folderExists, repoExistsOnGithub } from '../utils/validation.mjs'

const { prompt } = enq

const renderer = (question) => {
    if (question.answer) {
        // Format for answered list question
        return chalk.green(`✓ ${question.message}: ${question.answer}`)
    } else {
        // Format for unanswered list question
        let choicesString = question.choices.map((choice) => `- ${choice.name}`).join('\n')
        return chalk.cyan(`**${question.message}**\n${choicesString}`)
    }
}

export async function inquireRepositoryDetails(name = '', templates, owner, octokit) {
    const questions = []

    let nameQuestion = {
        name: 'name',
        type: 'input',
        message: 'Enter the repository name:',
        initial: name,
        validateImmediately: !!name,
        validate: async (input) => {
            if (!isValidName(input)) {
                return 'No Spaces or special characters (- _ allowed). Please choose a different name.'
            }

            if (folderExists(input)) {
                return 'Folder already exists. Please choose a different name.'
            }

            if (await repoExistsOnGithub(owner, input, octokit)) {
                return 'Repository already exists on GitHub. Please choose a different name.'
            }

            return true
        }
    }

    if (name) {
        let nameError = await nameQuestion.validate(name)
        if (nameError !== true) {
            questions.push(nameQuestion)
        } else {
            console.log(
                chalk.green(`✓`),
                chalk.bold('Repository name: '),
                chalk.green(`${name}`)
            )
        }
    } else {
        questions.push(nameQuestion)
    }

    questions.push(
        {
            name: 'description',
            type: 'input',
            message: 'Enter the repository description:',
        },
        {
            name: 'template',
            type: 'select',
            message: 'Select a repository template:',
            choices: templates
        },
        {
            name: 'private',
            type: 'confirm',
            message: 'Make the repository private?',
            default: false
        }
    )

    const answers = await prompt(questions)

    return {
        ...answers,
        name: name || answers.name
    }
}

export async function promptForGitHubToken() {
    const questions = [
        {
            name: 'token',
            type: 'password', // Use password type for security
            message: 'GITHUB_TOKEN environment variable not set. Enter a GitHub access token:',
        }
    ]

    const answers = await prompt(questions)
    return answers.token
}