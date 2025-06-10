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

  console.log(committedGitFiles);

  if (committedGitFiles.length > 0) {
    return process.exit(0);
  } else {
    return process.exit(1);
  }
})().catch((err) => {
  console.log(err);
});
