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
    console.dir(push);

    const pusherNames = ['@'+push.pusher.name];
    if (push.pusher.email) {
      pusherNames.push(push.pusher.email);
    }
    core.info(`pusher: ${pusherNames.join(' aka ')}`);

    const ref = push.ref;
    const beforeSha = push.before;
    const afterSha = push.after;
    core.info(`ref: ${ref}\nbeforeSha: ${beforeSha}\nafterSha: ${afterSha}`);

    const token = core.getInput('token', {required: true});
    const octokit = github.getOctokit(token);

    const ownersFilePath = core.getInput('ownersPath', {required: true});
    const owners = await Owners.load(
      octokit,
      push.repository.owner.login,
      push.repository.name,
      ownersFilePath,
      beforeSha
    );

    // push.commit.added, push.commit.modified, push.commit.removed are undefined for some reason
    // so we load each commit
    for (let commitRef of push.commits) {
      const commit = await octokit.rest.repos.getCommit({
        owner: push.repository.owner.login,
        repo: push.repository.name,
        ref: commitRef.id,
      });
      const files = commit.data.files;
      if (!files) continue;
      for (let file of files) {
        core.info(` * ${file.filename}`);
        if (!pusherNames.some(name => owners.isOwner(name, file.filename))) {
          throw new Error(`${pusherNames.join(' aka ')} is not authorized to change ${file.filename}`);
        }
      }
    }
    core.info('\n');
}

run();
