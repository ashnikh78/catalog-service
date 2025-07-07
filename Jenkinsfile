pipeline {
  agent any
  environment {
    DOCKER_IMAGE = "yourrepo/user-service:${env.BUILD_NUMBER}"
  }
  stages {
    stage('Checkout') {
      steps { checkout scm }
    }
    stage('Install & Test') {
      steps {
        sh 'npm install'
        sh 'npm run test' // or 'npx jest --config jest.config.js --runInBand'
      }
    }
    stage('Build Docker Image') {
      steps {
        sh 'docker build -t $DOCKER_IMAGE .'
      }
    }
    stage('Push Docker Image') {
      steps {
        withCredentials([usernamePassword(credentialsId: 'dockerhub', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
          sh 'echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin'
          sh 'docker push $DOCKER_IMAGE'
        }
      }
    }
    stage('Deploy') {
      steps {
        // Add your deployment logic here (e.g., kubectl apply, docker-compose up, etc.)
      }
    }
  }
}
