

export async function createGitHubRepository(name, description, isPrivate, octokit) {
    try {
        const response = await octokit.repos.createForAuthenticatedUser({
            name,
            description,
            private: isPrivate,
        })

        return response.data.clone_url
    } catch (error) {
        console.error('Error creating GitHub repository:', error)
        return null
    }
}