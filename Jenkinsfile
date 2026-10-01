pipeline {
  agent any

  options {
    timestamps()
    timeout(time: 30, unit: 'MINUTES')
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  environment {
    // A credential rather than a global variable because the Jenkins instance
    // is shared with the API job. The build inlines it and src/config/api.ts
    // refuses to load without it.
    NEXT_PUBLIC_API_URL = credentials('next-public-api-url')
    CI = 'true'
    NEXT_TELEMETRY_DISABLED = '1'
  }

  stages {
    stage('Install') {
      steps { sh 'pnpm install --frozen-lockfile' }
    }

    stage('Static checks') {
      parallel {
        stage('Lint') {
          steps { sh 'pnpm lint' }
        }
        stage('Typecheck') {
          steps { sh 'pnpm typecheck' }
        }
        stage('Format') {
          steps { sh 'pnpm format:check' }
        }
      }
    }

    stage('Test') {
      steps {
        // Four suites sign in against the real API, by the user's decision.
        withCredentials([usernamePassword(
          credentialsId: 'test-user',
          usernameVariable: 'TEST_USER_EMAIL',
          passwordVariable: 'TEST_USER_PASSWORD'
        )]) {
          sh 'pnpm test:coverage --reporter=default --reporter=junit --outputFile.junit=reports/junit.xml'
        }
      }
      post {
        always {
          junit allowEmptyResults: true, testResults: 'reports/junit.xml'
          archiveArtifacts artifacts: 'coverage/lcov.info', allowEmptyArchive: true
        }
      }
    }

    stage('Build') {
      steps { sh 'pnpm build' }
    }

    stage('SonarQube') {
      steps {
        // The server comes from SONAR_HOST_URL, set on the Jenkins controller.
        withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
          sh 'pnpm dlx @sonar/scan'
        }
      }
    }
  }

  post {
    cleanup { cleanWs() }
  }
}
