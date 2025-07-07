// This Jenkinsfile defines a CI/CD pipeline for the Catalog Service using Jenkins Pipeline DSL.
// It includes stages for checking out the code, installing dependencies, running tests, building and pushing
pipeline {
  agent any
  environment {
    DOCKER_IMAGE = "yourrepo/catalog-service:${env.BUILD_NUMBER}"
    DOCKER_IMAGE_LATEST = "yourrepo/catalog-service:latest"
    DOCKER_REGISTRY = "docker.io" // Replace with your registry, e.g., 'ghcr.io' or '123456789012.dkr.ecr.us-east-1.amazonaws.com'
    KUBE_NAMESPACE = "catalog-service"
    KUBE_CREDENTIALS_ID = "kubeconfig" // Jenkins credential ID for Kubernetes config
    NODE_ENV = "test" // Default to test for pipeline execution
  }
  stages {
    stage('Checkout') {
      steps {
        checkout scm
        sh 'echo "Checked out code from SCM"'
      }
    }
    stage('Install Dependencies') {
      steps {
        sh 'npm install'
        sh 'echo "Installed Node.js dependencies"'
      }
    }
    stage('Run Unit Tests') {
      steps {
        sh 'npm run test'
        sh 'echo "Unit tests completed successfully"'
      }
      post {
        failure {
          error 'Unit tests failed, aborting build'
        }
      }
    }
    stage('Run Integration Tests') {
      steps {
        sh 'npm run test:integration'
        sh 'echo "Integration tests completed successfully"'
      }
      post {
        failure {
          error 'Integration tests failed, aborting build'
        }
      }
    }
    stage('Build Docker Image') {
      steps {
        sh 'docker build -t $DOCKER_IMAGE -t $DOCKER_IMAGE_LATEST .'
        sh 'echo "Built Docker images: $DOCKER_IMAGE and $DOCKER_IMAGE_LATEST"'
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
          sh 'echo $DOCKER_PASS | docker login $DOCKER_REGISTRY -u $DOCKER_USER --password-stdin'
          sh 'docker push $DOCKER_IMAGE'
          sh 'docker push $DOCKER_IMAGE_LATEST'
          sh 'echo "Pushed Docker images to $DOCKER_REGISTRY"'
        }
      }
      post {
        failure {
          error 'Docker push failed, aborting'
        }
      }
    }
    stage('Deploy to Kubernetes') {
      steps {
        withCredentials([file(credentialsId: "${KUBE_CREDENTIALS_ID}", variable: 'KUBECONFIG')]) {
          sh '''
            export KUBECONFIG=$KUBECONFIG
            kubectl set image deployment/catalog-service catalog-service=$DOCKER_IMAGE -n $KUBE_NAMESPACE --record
            kubectl rollout status deployment/catalog-service -n $KUBE_NAMESPACE --timeout=120s
            echo "Deployed $DOCKER_IMAGE to Kubernetes namespace $KUBE_NAMESPACE"
          '''
        }
      }
      post {
        failure {
          sh '''
            export KUBECONFIG=$KUBECONFIG
            kubectl rollout undo deployment/catalog-service -n $KUBE_NAMESPACE
            echo "Rolled back deployment due to failure"
          '''
          error 'Kubernetes deployment failed, rolled back'
        }
      }
    }
  }
  post {
    always {
      sh 'docker logout'
      cleanWs()
      sh 'echo "Cleaned workspace and logged out from Docker registry"'
    }
    success {
      echo 'Build, test, and deployment completed successfully'
    }
    failure {
      echo 'Build, test, or deployment failed'
    }
  }
}