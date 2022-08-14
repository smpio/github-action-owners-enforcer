import {RequestError} from '@octokit/request-error'
import { GitHub } from '@actions/github/lib/utils'
import minimatch from 'minimatch'

type Octokit = InstanceType<typeof GitHub>;

export interface Entry {
  glob: string,
  owners: string[],
}

export class Owners {
  entries: Entry[];

  constructor(entries: Entry[] = []) {
    this.entries = entries;
  }

  isOwner(who: string, path: string): boolean {
    return this.entries.some(entry => {
      if (entry.owners.indexOf(who) === -1) return false;
      return minimatch(path, entry.glob, {matchBase: true});
    });
  }

  static async load(octokit: Octokit, owner: string, repo: string, path: string, ref: string): Promise<Owners> {
    let ownersData;

    try {
      const ownersFile = await octokit.rest.repos.getContent({owner, repo, path, ref});

      if (ownersFile.data instanceof Array || !('content' in ownersFile.data)) {
        console.dir(ownersFile);
        throw new Error(`Unexpected ${path} getContent response`);
      }

      if (ownersFile.data.type !== 'file') {
        throw new Error(`Unexpected ${path} type: ${ownersFile.data.type}`);
      }

      if (ownersFile.data.encoding !== 'base64') {
        throw new Error(`Unexpected ${path} getContent response encoding: ${ownersFile.data.encoding}`);
      }

      ownersData = Buffer.from(ownersFile.data.content, 'base64').toString();
    }
    catch (err) {
      if (err instanceof RequestError && err.status === 404) {
        throw new Error(`File ${path} does not exist`);
      } else {
        throw err;
      }
    }

    // TODO: expand teams
    // https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners#example-of-a-codeowners-file
    return this.parse(ownersData);
  }

  static parse(data: string): Owners {
    let entries: Entry[] = [];
    for (let line of data.split('\n')) {
      line = line.trim();
      if (line.length === 0) continue;
      let [glob, ...owners] = line.split(/\s+/);
      entries.push({glob, owners});
    }
    return new this(entries);
  }
}
