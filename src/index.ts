import * as core from '@actions/core'
import * as github from '@actions/github'
import {PushEvent} from '@octokit/webhooks-types/schema'
import {Owners} from './owners'

async function run() {
  if (github.context.eventName !== 'push') {
    core.error(`Unexpected event: ${github.context.eventName})`);
    return;
  }

  const push = github.context.payload as PushEvent;

  const pusherNames = ['@'+push.pusher.name];
  if (push.pusher.email) {
    pusherNames.push(push.pusher.email);
  }
  core.info(`pusher: ${pusherNames.join(' aka ')}`);

  const repo = {
    owner: push.repository.owner.login,
    repo: push.repository.name,
  };
  const ref = push.ref;
  const beforeSha = push.before;
  const afterSha = push.after;
  core.info(`ref: ${ref}`);
  core.info(`before sha: ${beforeSha}`);
  core.info(`after sha:  ${afterSha}`);

  const token = core.getInput('token', {required: true});
  const octokit = github.getOctokit(token);

  const ownersFilePath = core.getInput('ownersPath', {required: true});
  const owners = await Owners.load(octokit, {
    ...repo,
    path: ownersFilePath,
    ref: beforeSha,
  });

  // push.commits[].{added,modified,removed} are undefined for some reason
  // so we load each commit
  for (let commitRef of push.commits) {
    core.info(`commit ${commitRef.id}`);
    const commit = await octokit.rest.repos.getCommit({
      ...repo,
      ref: commitRef.id,
    });
    core.info(`> ${commit.data.commit.message}`);
    const files = commit.data.files;
    if (!files) continue;
    for (let file of files) {
      const ok = pusherNames.some(name => owners.isOwner(name, file.filename));
      core.info(` * ${file.filename}\t ${ok ? 'OK' : 'OWNERSHIP FAILURE'}`);
      if (!ok) {
        return;
      }
    }
  }
}

run();
