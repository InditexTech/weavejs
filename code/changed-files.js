import gitChangedFiles from 'git-changed-files';

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('No arguments provided');
  process.exit(1);
}

const baseBranch = process.env.CHANGES_BASE_BRANCH || 'main';

(async () => {
  let committedGitFiles = await gitChangedFiles({
    baseBranch,
    formats: args,
  });

  console.log(committedGitFiles.committedFiles.length);
  process.exit(0);
})().catch((err) => {
  console.log(err);
  process.exit(1);
});
