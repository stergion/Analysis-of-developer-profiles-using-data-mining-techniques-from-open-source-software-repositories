# Analysis of developer profiles using data mining techniques from open source software repositories
The backend part of the Developer's profile application

A backend server developed as part of Stergios Nanos' diploma thesis "Analysis of developer profiles using data mining techniques from open source software repositories"

## Usage
For installation clone the repository and then use:

```
npn install
```

Make sure to set `src/serverconfig.json`

Also, make sure enviromental variables are set in `.env`

## Classifier
The original programmer roles classifer can be found at [stergion/programmer_roles_classifier](https://github.com/stergion/programmer_roles_classifier)

## Enviromental Variables
Make sure all the variables are set
```
PORT=3000
NODE_ENV
DB_CLUSTER_URL
DB_NAME
GITHUB_APP_ID
APP_USERNAME
APP_PASS
APP_SECRET
GITHUB_WEBHOOK_SECRET
GITHUB_PRIVATE_KEY

// when NODE_ENV=="dev"
DB_USERNAME
DB_X509_CERT_PATH

// when NODE_ENV=="production"
DB_USER
DB_PASS
```

## Known Issues
There is a bug with the [octokit/plugin-paginate-graphql](https://github.com/octokit/plugin-paginate-graphql.js), as reported in the issue [#58](https://github.com/octokit/plugin-paginate-graphql.js/issues/58).

You can manually implement the fix proposed in the pull request [#59](https://github.com/octokit/plugin-paginate-graphql.js/pull/59), until the package is updated.

