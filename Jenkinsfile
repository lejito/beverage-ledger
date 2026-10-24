// The CI members of the organization the browser suites sign in as.
def ciAccounts() {
  return [
    usernamePassword(credentialsId: 'ci-admin', usernameVariable: 'CI_ADMIN_EMAIL', passwordVariable: 'CI_ADMIN_PASSWORD'),
    usernamePassword(credentialsId: 'ci-manager', usernameVariable: 'CI_MANAGER_EMAIL', passwordVariable: 'CI_MANAGER_PASSWORD'),
    usernamePassword(credentialsId: 'ci-operator', usernameVariable: 'CI_OPERATOR_EMAIL', passwordVariable: 'CI_OPERATOR_PASSWORD')
  ]
}

// Cucumber and Cypress do not start the app the way Playwright's webServer does.
// Served in the same sh step as the suite: Jenkins kills what a step leaves
// behind, so a server started in a step of its own would be gone by the next.
def withApp(String command) {
  sh """
    pnpm start > next-start.log 2>&1 &
    app=\$!
    trap 'kill \$app 2>/dev/null || true' EXIT
    timeout 120 sh -c 'until curl -sf -o /dev/null http://localhost:3000/login; do sleep 2; done'
    ${command}
  """
}

// The image carries no Google Chrome: Selenium IDE, Stagehand and cy.prompt
// drive the Chromium that Playwright downloads into PLAYWRIGHT_BROWSERS_PATH.
def chromium() {
  return sh(script: "node -e \"process.stdout.write(require('playwright-core').chromium.executablePath())\"", returnStdout: true)
}

pipeline {
  agent any

  options {
    timestamps()
    // The browser suites pace their logins to the API's rate limit, which is
    // most of their running time.
    timeout(time: 90, unit: 'MINUTES')
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
        // pnpm runs no install scripts (pnpm-workspace.yaml), Cypress's download
        // of its app included. It lands in ~/.cache/Cypress, on the same volume.
        sh 'pnpm exec cypress install'
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
        stage('Funcionales') {
          steps {
            sh 'pnpm test:funcional --coverage --coverage.reportsDirectory=coverage/funcional --reporter=default --reporter=junit --outputFile.junit=reports/funcional.xml'
          }
          post {
            always { junit allowEmptyResults: true, testResults: 'reports/funcional.xml' }
          }
        }

        stage('Seguridad') {
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
        stage('Screenplay + Serenity') {
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

        // The same Screenplay tasks, driven by the Spanish .feature files in
        // e2e/features through Cucumber.
        stage('Gherkin (Cucumber + Screenplay)') {
          options { lock('render-api') }
          steps {
            withCredentials(ciAccounts()) {
              withApp('pnpm test:gherkin')
            }
          }
          post {
            always {
              junit allowEmptyResults: true, testResults: 'reports/gherkin.xml'
              sh 'pnpm test:gherkin:report || true'
              archiveArtifacts artifacts: 'target/site/serenity-gherkin/**', allowEmptyArchive: true
              publishHTML(target: [
                reportName: 'Serenity BDD (Gherkin)',
                reportDir: 'target/site/serenity-gherkin',
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

    stage('Pruebas E2E: Playwright') {
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

    // Flows, API, security and accessibility of the six requirements. Cypress
    // takes its login slots from the same budget file as the Playwright suites.
    stage('Pruebas E2E: Cypress') {
      options { lock('render-api') }
      steps {
        withCredentials(ciAccounts()) {
          withApp('pnpm test:cypress')
        }
      }
      post {
        always {
          archiveArtifacts artifacts: 'reports/cypress/**', allowEmptyArchive: true
          publishHTML(target: [
            reportName: 'Cypress (Mochawesome)',
            reportDir: 'reports/cypress',
            reportFiles: 'index.html',
            keepAll: true,
            alwaysLinkToLastBuild: true,
            allowMissing: true
          ])
        }
      }
    }

    // Recorded steps, no model: deterministic, so it gates like the suites above.
    stage('Pruebas de regresión: Selenium IDE (grabación y reproducción)') {
      options { lock('render-api') }
      steps {
        script { env.CHROME_PATH = chromium() }
        withCredentials(ciAccounts()) {
          withApp('pnpm test:selenium')
        }
      }
      post {
        // The filled-in copy of the project carries the credentials: only the results.
        always {
          archiveArtifacts artifacts: 'reports/selenium/*.json, reports/selenium/screenshots/**', allowEmptyArchive: true
        }
      }
    }

    // The model-driven suites run on every build and leave their evidence in it,
    // but never gate: catchError marks the stage and keeps the build green. Here
    // and not after the deploy, whose `vercel build` rewrites .next with Vercel's
    // environment, so they would serve a build other than the one tested.
    stage('Pruebas con IA (no bloquean)') {
      options { lock('render-api') }
      stages {
        stage('Stagehand (act, observe, extract)') {
          steps {
            catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
              withCredentials(ciAccounts() + [string(credentialsId: 'google-generative-ai-api-key', variable: 'GOOGLE_GENERATIVE_AI_API_KEY')]) {
                script {
                  if (env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()) {
                    sh 'pnpm test:stagehand'
                  } else {
                    echo 'GOOGLE_GENERATIVE_AI_API_KEY está vacía: Stagehand no corre.'
                  }
                }
              }
            }
          }
          post {
            always {
              junit allowEmptyResults: true, testResults: 'reports/stagehand.xml'
              archiveArtifacts artifacts: 'reports/stagehand/**', allowEmptyArchive: true
            }
          }
        }

        stage('Cypress Cloud (cy.prompt)') {
          steps {
            catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
              withCredentials(ciAccounts() + [
                string(credentialsId: 'cypress-project-id', variable: 'CYPRESS_PROJECT_ID'),
                string(credentialsId: 'cypress-record-key', variable: 'CYPRESS_RECORD_KEY')
              ]) {
                script {
                  if (env.CYPRESS_PROJECT_ID?.trim() && env.CYPRESS_RECORD_KEY?.trim()) {
                    // --browser takes a path as well as a name: cy.prompt needs Chromium.
                    withApp('pnpm exec cypress run --config-file cypress.prompt.config.ts --record --browser "$CHROME_PATH"')
                  } else {
                    echo 'Falta el proyecto de Cypress Cloud: cy.prompt no corre.'
                  }
                }
              }
            }
          }
          post {
            always {
              archiveArtifacts artifacts: 'reports/cypress-prompt/**', allowEmptyArchive: true
            }
          }
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
