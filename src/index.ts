import * as core from '@actions/core'
import * as github from '@actions/github'
import {PushEvent} from '@octokit/webhooks-types/schema'
import {Owners} from './owners'

async function run() {
  if (github.context.eventName !== 'push') {
    console.error(`Unexpected event: ${github.context.eventName})`);
    return;
  }

  const push = github.context.payload as PushEvent;

  const pusherNames = ['@'+push.pusher.name];
  if (push.pusher.email) {
    pusherNames.push(push.pusher.email);
  }
  console.log(`pusher: ${pusherNames.join(' aka ')}`);

  const repo = {
    owner: push.repository.owner.login,
    repo: push.repository.name,
  };
  const ref = push.ref;
  const beforeSha = push.before;
  const afterSha = push.after;
  console.log(`source ref: ${ref}`);
  console.log(`before sha: ${beforeSha}`);
  console.log(`after sha:  ${afterSha}`);

  const token = core.getInput('token', {required: true});
  const octokit = github.getOctokit(token);

  const targetBranchName = core.getInput('targetBranch', {required: true});
  const targetBranch = await octokit.rest.repos.getBranch({
    ...repo,
    branch: targetBranchName,
  });
  const targetHead = targetBranch.data.commit.sha;

  console.log(`target ref: refs/heads/${targetBranchName}`);
  console.log(`target sha: ${targetHead}`);

  if (targetHead !== beforeSha) {
    throw new Error(`Target branch commit is not the same as previous commit in source (before sha != target sha)`);
  }

  const ownersFilePath = core.getInput('ownersPath', {required: true});
  const owners = await Owners.load(octokit, {
    ...repo,
    path: ownersFilePath,
    ref: beforeSha,
  });

  // push.commits[].{added,modified,removed} are undefined for some reason
  // so we need to load each commit
  const isOwnershipOk = await (async () => {
    for (let commitRef of push.commits) {
      console.log(`commit ${commitRef.id}`);
      const commit = await octokit.rest.repos.getCommit({
        ...repo,
        ref: commitRef.id,
      });
      console.log(`> ${commit.data.commit.message}`);
      const files = commit.data.files;
      if (!files) continue;
      for (let file of files) {
        const ok = pusherNames.some(name => owners.isOwner(name, file.filename));
        console.log(` * ${file.filename}\t ${ok ? 'OK' : 'OWNERSHIP FAILURE'}`);
        if (!ok) {
          return false;
        }
      }
    }
    return true;
  })();

  if (isOwnershipOk) {
    const targetRef = 'refs/heads/' + targetBranchName;
    console.log(`Pushing ${ref} to ${targetRef}`);
    await octokit.rest.git.updateRef({
      ...repo,
      ref: targetRef,
      sha: afterSha,
    });
  } else {
    console.log(`Force pushing ${ref} back to ${beforeSha}`);
    await octokit.rest.git.updateRef({
      ...repo,
      ref: ref,
      sha: beforeSha,
      force: true,
    });
  }
}

run();
