const workflow = {
  name: 'Node.js Package Test',

  concurrency: {
    group: 'test-${{ github.event_name }}',
    'cancel-in-progress': true
  },

  on: {
    workflow_dispatch: {},
    push: {
      paths: ['**/test*/**', '**/test*', '**/src/**']
    }
  },

  env: {
    CI_NODE_VERSION: '24.16.0',
    CI_PYTHON_VERSION: '3.11',
    ACCESS_TOKEN: '${{ secrets.ACCESS_TOKEN || secrets.GITHUB_TOKEN || github.token }}',
    GH_TOKEN: '${{ secrets.ACCESS_TOKEN || secrets.GITHUB_TOKEN || github.token }}'
  },

  jobs: {
    ci: {
      name: '🔨 Build, Pack & Test',
      'runs-on': 'ubuntu-latest',

      steps: [
        {
          name: '⬇️ Checkout workflow repository',
          uses: 'actions/checkout@v6'
        },
        {
          name: '⬇️ Setup CI Environment',
          uses: './.github/actions/setup-environments',
          with: {
            'node-version': '${{ env.CI_NODE_VERSION }}',
            'python-version': '${{ env.CI_PYTHON_VERSION }}',
            token: '${{ secrets.ACCESS_TOKEN || secrets.GITHUB_TOKEN || github.token }}',
            'prefix-cache-key': '${{ runner.os }}-test-'
          }
        },
        {
          name: '📦 Install dependencies',
          run: `touch yarn.lock && corepack yarn install`
        },
        {
          name: '🔨 Build project',
          run: 'corepack yarn build'
        },
        {
          name: '📦 Pack project',
          run: 'corepack yarn pack'
        },
        // {
        //   name: '🧪 Run committed composite tests action',
        //   uses: './.github/actions/run-tests',
        //   env: {
        //     ACCESS_TOKEN: '${{ secrets.ACCESS_TOKEN || secrets.GITHUB_TOKEN || github.token }}',
        //     GH_TOKEN: '${{ secrets.ACCESS_TOKEN || secrets.GITHUB_TOKEN || github.token }}'
        //   }
        // },
        {
          name: '🧹 Clean GitHub Actions Cache',
          // if: 'always()',
          'continue-on-error': true,
          env: {
            GH_TOKEN: '${{ secrets.ACCESS_TOKEN || secrets.GITHUB_TOKEN || github.token }}'
          },
          shell: 'bash',
          run: `npx --legacy-peer-deps -y binary-collections@https://raw.githubusercontent.com/dimaslanjaka/bin/master/releases/bin.tgz clean-github-actions-caches --repo "\${{ github.repository }}" --sha "\${{ github.sha }}"`
        }
      ]
    }
  }
};
module.exports = workflow;
