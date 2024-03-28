import fs from 'fs';
import path from 'path';


function isValidName(name) {
    // Check if the name contains only allowed characters
    const allowedChars = /^[A-Za-z0-9-_]+$/;
    return allowedChars.test(name);
}

function folderExists(name) {
    // Check if the folder already exists
    return fs.existsSync(path.join(process.cwd(), name));
}

async function repoExistsOnGithub(owner, name, octokit) {
    try {
        await octokit.repos.get({ owner, repo: name });
        return true;
    } catch (error) {
        if (error.status === 404) {
            return false;
        }
        throw error;
    }
}

export { isValidName, folderExists, repoExistsOnGithub };
