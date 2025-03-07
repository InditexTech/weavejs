# `code-PR_verify-fallback`

[`code-PR_verify-fallback.yml`](../code-PR_verify-fallback.yml) workflow allows to pass Required Status Checks in pull request with changes outside the monitored paths:
- `code/**`
- `.github/workflows/code*`

Take a look to the related documentation: [Handling skipped but required checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/troubleshooting-required-status-checks#handling-skipped-but-required-checks)

## Trigger
Any pull request `opened` with only changes outside `code` folder or `code-*` workflows.

## Where does it run?

`ubuntu-24.04` GitHub infrastructure.

## Jobs

- ### `unit-test`
This job is defined **exclusively** to fulfill the Required Status Check of **"Code / Verify"**, and it **does not actually run**, since it is enough to be skipped to comply with the required check (`if: 'false'`).
