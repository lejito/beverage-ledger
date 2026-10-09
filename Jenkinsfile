// The CI members of the organization the browser suites sign in as.
def ciAccounts() {
  return [
    usernamePassword(credentialsId: 'ci-admin', usernameVariable: 'CI_ADMIN_EMAIL', passwordVariable: 'CI_ADMIN_PASSWORD'),
    usernamePassword(credentialsId: 'ci-manager', usernameVariable: 'CI_MANAGER_EMAIL', passwordVariable: 'CI_MANAGER_PASSWORD'),
    usernamePassword(credentialsId: 'ci-operator', usernameVariable: 'CI_OPERATOR_EMAIL', passwordVariable: 'CI_OPERATOR_PASSWORD')
  ]
}

pipeline {
  agent any

  options {
    timestamps()
    // The browser suites pace their logins to the API's rate limit, which is
    // most of their running time.
    timeout(time: 60, unit: 'MINUTES')
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
      steps {
        sh 'pnpm install --frozen-lockfile'
        // The browser lives in PLAYWRIGHT_BROWSERS_PATH, on the Jenkins volume,
        // so after the first build this only checks it is already there.
        sh 'pnpm exec playwright install chromium'
      }
    }

    stage('Revisión estática') {
      steps {
        sh 'pnpm lint'
        sh 'pnpm typecheck'
        sh 'pnpm format:check'
      }
    }

    stage('Pruebas unitarias') {
      steps {
        sh 'pnpm test:unit --coverage --coverage.reportsDirectory=coverage/unit --reporter=default --reporter=junit --outputFile.junit=reports/unit.xml'
      }
      post {
        always { junit allowEmptyResults: true, testResults: 'reports/unit.xml' }
      }
    }

    stage('Compilación') {
      steps { sh 'pnpm build' }
    }

    stage('Pruebas de regresión') {
      stages {
        stage('Pruebas funcionales') {
          steps {
            sh 'pnpm test:funcional --coverage --coverage.reportsDirectory=coverage/funcional --reporter=default --reporter=junit --outputFile.junit=reports/funcional.xml'
          }
          post {
            always { junit allowEmptyResults: true, testResults: 'reports/funcional.xml' }
          }
        }

        stage('Pruebas de seguridad') {
          steps {
            sh 'pnpm test:seguridad --reporter=default --reporter=junit --outputFile.junit=reports/seguridad.xml'
            // Production dependencies only: dev tooling never reaches Vercel.
            sh 'pnpm audit --prod --audit-level high'
          }
          post {
            always { junit allowEmptyResults: true, testResults: 'reports/seguridad.xml' }
          }
        }

        // The compiled app, served by `next start`, against the API deployed on
        // Render. The lock keeps this job and the API job from sharing the login
        // rate limit at the same time.
        stage('Pruebas automatizadas (Screenplay + Serenity)') {
          options { lock('render-api') }
          steps {
            withCredentials(ciAccounts()) {
              sh 'pnpm test:screenplay'
            }
          }
          post {
            always {
              junit allowEmptyResults: true, testResults: 'reports/screenplay.xml'
              // Serenity BDD's living documentation, built with the JDK the
              // Jenkins image already runs on. A failed report must not hide the
              // result of the scenarios themselves.
              sh 'pnpm test:screenplay:report || true'
              archiveArtifacts artifacts: 'target/site/serenity/**', allowEmptyArchive: true
              publishHTML(target: [
                reportName: 'Serenity BDD',
                reportDir: 'target/site/serenity',
                reportFiles: 'index.html',
                keepAll: true,
                alwaysLinkToLastBuild: true,
                allowMissing: true
              ])
            }
          }
        }
      }
      post {
        always { archiveArtifacts artifacts: 'coverage/*/lcov.info', allowEmptyArchive: true }
      }
    }

    stage('Pruebas E2E') {
      options { lock('render-api') }
      steps {
        withCredentials(ciAccounts()) {
          sh 'pnpm test:e2e'
        }
      }
      post {
        always {
          junit allowEmptyResults: true, testResults: 'reports/e2e.xml'
          archiveArtifacts artifacts: 'reports/e2e/**, test-results/**', allowEmptyArchive: true
        }
      }
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
