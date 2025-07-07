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
  }
  stages {
    stage('Checkout') {
      steps {
        checkout([$class: 'GitSCM', branches: [[name: '*/master']], userRemoteConfigs: [[url: 'https://github.com/ashnikh78/catalog-service.git', credentialsId: 'github-credentials']]])
        bat 'echo "Checked out code from SCM"'
      }
    }
    stage('Install Dependencies') {
      steps {
        bat 'npm install'
        bat 'echo "Installed Node.js dependencies"'
      }
    }
    stage('Run Unit Tests') {
      steps {
        bat 'npm run test'
        bat 'echo "Unit tests completed successfully"'
      }
      post {
        failure {
          error 'Unit tests failed, aborting build'
        }
      }
    }
    stage('Run Integration Tests') {
      steps {
        bat 'npm run test:integration'
        bat 'echo "Integration tests completed successfully"'
      }
      post {
        failure {
          error 'Integration tests failed, aborting build'
        }
      }
    }
    stage('Build Docker Image') {
      steps {
        bat 'docker build -t %DOCKER_IMAGE% -t %DOCKER_IMAGE_LATEST% .'
        bat 'echo "Built Docker images: %DOCKER_IMAGE% and %DOCKER_IMAGE_LATEST%"'
      }
      post {
        failure {
          error 'Docker build failed, aborting'
        }
      }
    }
    stage('Push Docker Image') {
      steps {
        withCredentials([usernamePassword(credentialsId: 'dockerhub', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
          bat 'echo %DOCKER_PASS% | docker login %DOCKER_REGISTRY% -u %DOCKER_USER% --password-stdin'
          bat 'docker push %DOCKER_IMAGE%'
          bat 'docker push %DOCKER_IMAGE_LATEST%'
          bat 'echo "Pushed Docker images to %DOCKER_REGISTRY%"'
        }
      }
      post {
        failure {
          error 'Docker push failed, aborting'
        }
      }
    }
    stage('Deploy to Docker') {
      steps {
        bat '''
          docker stop catalog-service || exit 0
          docker rm catalog-service || exit 0
          docker pull %DOCKER_IMAGE%
          docker run -d --name catalog-service --env-file %ENV_FILE_PATH% -p 3011:3011 %DOCKER_IMAGE%
          ping 127.0.0.1 -n 6 > nul
          curl -f http://localhost:3011/health || exit 1
          echo "Deployed %DOCKER_IMAGE% locally"
        '''
      }
      post {
        failure {
          error 'Docker deployment failed'
        }
      }
    }
  }
  post {
    always {
      bat 'docker logout'
      cleanWs()
      bat 'echo "Cleaned workspace and logged out from Docker registry"'
    }
    success {
      echo 'Build, test, and deployment completed successfully'
    }
    failure {
      echo 'Build, test, or deployment failed'
    }
  }
}