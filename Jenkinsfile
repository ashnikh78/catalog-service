pipeline {
  agent any
  environment {
    DOCKER_IMAGE = "ashnikh78/catalog-service:${env.BUILD_NUMBER}"
    DOCKER_IMAGE_LATEST = "ashnikh78/catalog-service:latest"
    DOCKER_REGISTRY = "docker.io"
    ENV_FILE_PATH = "D:/code/anand/printvista/services/catalog-service/.env"
  }
  tools {
    nodejs "Node18"
    git "GitDefaultTool"
  }
  options {
    timestamps()
    skipStagesAfterUnstable()
    buildDiscarder(logRotator(numToKeepStr: '10'))
  }
  stages {
    stage('Checkout Source') {
      steps {
        script {
          checkout([$class: 'GitSCM',
            branches: [[name: '*/master']],
            userRemoteConfigs: [[
              url: 'https://github.com/ashnikh78/catalog-service.git',
              credentialsId: 'github-creds'
            ]]
          ])
          bat 'git --version'
          bat 'echo "✅ Code checked out successfully"'
        }
      }
    }
    stage('Install Dependencies') {
      steps {
        bat 'npm install'
      }
    }
    stage('Run Unit Tests') {
      steps {
        bat 'npm run test'
      }
      post {
        always {
          junit allowEmptyResults: true, testResults: '**/test-results/*.xml'
        }
        failure {
          error '❌ Unit tests failed'
        }
      }
    }
    stage('Run Integration Tests') {
      steps {
        script {
          // Check if integration test script exists first
          def packageJsonContent = readFile('package.json')
          def hasIntegrationTests = packageJsonContent.contains('"test:integration"')
          
          if (hasIntegrationTests) {
            echo "🔍 Running integration tests..."
            def result = bat(script: 'npm run test:integration', returnStatus: true)
            if (result != 0) {
              echo "❌ Integration tests failed"
              currentBuild.result = 'UNSTABLE'
            } else {
              echo "✅ Integration tests passed"
            }
          } else {
            echo "⚠️ No integration tests script found in package.json - skipping integration tests"
            echo "💡 To add integration tests, add 'test:integration' script to package.json"
          }
        }
      }
      post {
        always {
          // Only collect test results if they exist
          script {
            if (fileExists('integration-test-results') || fileExists('test-results')) {
              junit allowEmptyResults: true, testResults: '**/integration-test-results/*.xml, **/test-results/*.xml'
            }
          }
        }
      }
    }
    stage('Build Docker Image') {
      steps {
        bat 'docker build -t %DOCKER_IMAGE% -t %DOCKER_IMAGE_LATEST% .'
      }
    }
    stage('Push Docker Image') {
      steps {
        withCredentials([usernamePassword(
          credentialsId: 'dockerhub',
          usernameVariable: 'DOCKER_USER',
          passwordVariable: 'DOCKER_PASS'
        )]) {
          bat 'echo %DOCKER_PASS% | docker login %DOCKER_REGISTRY% -u %DOCKER_USER% --password-stdin'
          bat 'docker push %DOCKER_IMAGE%'
          bat 'docker push %DOCKER_IMAGE_LATEST%'
        }
      }
    }
    stage('Deploy Locally') {
      steps {
        bat '''
          docker stop catalog-service || exit 0
          docker rm catalog-service || exit 0
          docker pull %DOCKER_IMAGE%
          docker run -d --name catalog-service --env-file "%ENV_FILE_PATH%" -p 3011:3011 %DOCKER_IMAGE%
          ping 127.0.0.1 -n 6 > nul
          curl -f http://localhost:3011/health || exit 1
        '''
      }
    }
  }
  post {
    always {
      bat 'docker logout'
      cleanWs()
    }
    success {
      echo '✅ Build, Test, and Deployment completed!'
    }
    unstable {
      echo '⚠️ Pipeline completed with warnings (some tests may be missing)'
    }
    failure {
      echo '❌ Pipeline failed!'
    }
  }
}