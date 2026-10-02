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
    stage('Instalación de dependencias') {
      steps { sh 'pnpm install --frozen-lockfile' }
    }

    stage('Revisión estática') {
      steps {
        sh 'pnpm lint'
        sh 'pnpm typecheck'
        sh 'pnpm format:check'
      }
    }

    stage('Pruebas (unitarias, regresión)') {
      steps {
        // Render's free plan sleeps after 15 idle minutes and takes about 50s to
        // wake, longer than the 5s a test waits. Wake it first, or the suites
        // that hit it time out on a cold start rather than on a real failure.
        sh 'curl --fail --silent --show-error --output /dev/null --retry 12 --retry-delay 10 --retry-all-errors --max-time 30 "$NEXT_PUBLIC_API_URL/api/v1/health"'
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

    stage('Compilación') {
      steps { sh 'pnpm build' }
    }

    stage('Calidad (SonarQube)') {
      steps {
        // The server comes from SONAR_HOST_URL, set on the Jenkins controller.
        // qualitygate.wait fails the stage when the gate fails, so nothing below
        // it ships.
        withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
          sh 'pnpm dlx @sonar/scan -Dsonar.qualitygate.wait=true'
        }
      }
    }

    stage('Despliegue') {
      // Git deployments are off (vercel.json): production moves only here,
      // after every stage above passed, and only from main.
      when { expression { env.GIT_BRANCH == 'origin/main' } }
      steps {
        withCredentials([
          string(credentialsId: 'vercel-token', variable: 'VERCEL_TOKEN'),
          string(credentialsId: 'vercel-org-id', variable: 'VERCEL_ORG_ID'),
          string(credentialsId: 'vercel-project-id', variable: 'VERCEL_PROJECT_ID')
        ]) {
          // The production build takes NEXT_PUBLIC_API_URL from the Vercel
          // project, pulled below. The pipeline's own value points the tests at
          // an API and would otherwise win, since the environment beats .env files.
          sh '''
            unset NEXT_PUBLIC_API_URL
            pnpm dlx vercel@62.0.0 pull --yes --environment=production --token="$VERCEL_TOKEN"
            pnpm dlx vercel@62.0.0 build --prod --token="$VERCEL_TOKEN"
            pnpm dlx vercel@62.0.0 deploy --prebuilt --prod --token="$VERCEL_TOKEN"
          '''
        }
      }
    }
  }

  post {
    cleanup { cleanWs() }
  }
}
