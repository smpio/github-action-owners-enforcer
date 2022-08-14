import * as core from '@actions/core'
import * as github from '@actions/github'
import {PushEvent} from '@octokit/webhooks-types/schema'
import {RequestError} from '@octokit/request-error'

async function run() {
    if (github.context.eventName !== 'push') {
      core.error(`Unexpected event: ${github.context.eventName})`);
      return;
    }

    const pushPayload = github.context.payload as PushEvent;

    const ref = pushPayload.ref;
    const beforeSha = pushPayload.before;
    const afterSha = pushPayload.after;
    core.info(`ref=${ref} beforeSha=${beforeSha} afterSha=${afterSha}`);

    // This should be a token with access to your repository scoped in as a secret.
    // The YML workflow will need to set myToken with the GitHub Secret Token
    // with:
    //   token: ${{ secrets.GITHUB_TOKEN }}
    // https://help.github.com/en/actions/automating-your-workflow-with-github-actions/authenticating-with-the-github_token#about-the-github_token-secret
    const token = core.getInput('token', {required: true});
    const octokit = github.getOctokit(token);

    const ownersFilePath = core.getInput('ownersPath', {required: true});
    try {
      const ownersFile = await octokit.rest.repos.getContent({
        owner: pushPayload.repository.owner.login,
        repo: pushPayload.repository.name,
        path: ownersFilePath,
        ref: beforeSha,
      });

      console.dir(ownersFile);
    } catch (err) {
      if (err instanceof RequestError && err.status === 404) {
        core.error(`File ${ownersFilePath} does not exist`);
        return;
      } else {
        throw err;
      }
    }
}

run();
