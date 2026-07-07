# Issue tracker: GitHub

Issues and PRDs for this repo live as GitHub issues in `felipepg22/CoffeePlanningPoker`. Use the `gh` CLI for all operations.

## Pull requests as a triage surface

**PRs as a request surface: no.**

External PRs are not part of the `/triage` intake queue for this repo.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.

## Common operations

- Create: `gh issue create --title "..." --body "..."`
- Read: `gh issue view <number> --comments`
- List: `gh issue list --state open --json number,title,body,labels,comments`
- Comment: `gh issue comment <number> --body "..."`
- Label: `gh issue edit <number> --add-label "..."`
- Close: `gh issue close <number> --comment "..."`
