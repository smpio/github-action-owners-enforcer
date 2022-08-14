import * as core from '@actions/core'
import * as github from '@actions/github'
import {PushEvent} from '@octokit/webhooks-types/schema'

async function run() {
    if (github.context.eventName !== 'push') {
      core.info(`Unexpected event: ${github.context.eventName}), exiting`);
      return;
    }

    const pushPayload = github.context.payload as PushEvent;
    core.info(`The head commit is: ${pushPayload.head_commit}`);

    // This should be a token with access to your repository scoped in as a secret.
    // The YML workflow will need to set myToken with the GitHub Secret Token
    // with:
    //   token: ${{ secrets.GITHUB_TOKEN }}
    // https://help.github.com/en/actions/automating-your-workflow-with-github-actions/authenticating-with-the-github_token#about-the-github_token-secret
    const token = core.getInput('token');
    const octokit = github.getOctokit(token);

    // You can also pass in additional options as a second parameter to getOctokit
    // const octokit = github.getOctokit(myToken, {userAgent: "MyActionVersion1"});

    // const { data: pullRequest } = await octokit.rest.pulls.get({
    //     owner: 'octokit',
    //     repo: 'rest.js',
    //     pull_number: 123,
    //     mediaType: {
    //       format: 'diff'
    //     }
    // });

    // console.log(pullRequest);
}

run();
