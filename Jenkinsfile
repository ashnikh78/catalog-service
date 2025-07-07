pipeline {
  agent any
  
  environment {
    DOCKER_IMAGE = "ashnikh78/catalog-service:${env.BUILD_NUMBER}"
    DOCKER_IMAGE_LATEST = "ashnikh78/catalog-service:latest"
    DOCKER_REGISTRY = "docker.io"
    DOCKER_USER = "ashnikh78@gmail.com"
    ENV_FILE_PATH = "D:/code/anand/printvista/services/catalog-service/.env"
    CONTAINER_NAME = "catalog-service"
    APP_PORT = "3011"
    HEALTH_ENDPOINT = "http://localhost:3011/health"
  }
  
  tools {
    nodejs "Node18"
    git "GitDefaultTool"
  }
  
  options {
    timestamps()
    skipStagesAfterUnstable()
    buildDiscarder(logRotator(numToKeepStr: '10'))
    timeout(time: 30, unit: 'MINUTES')
  }
  
  stages {
    stage('Checkout Source') {
      steps {
        script {
          echo "🔄 Checking out source code..."
          checkout([$class: 'GitSCM',
            branches: [[name: '*/master']],
            userRemoteConfigs: [[
              url: 'https://github.com/ashnikh78/catalog-service.git',
              credentialsId: 'github-creds'
            ]]
          ])
          
          // Display Git information
          bat 'git --version'
          bat 'git rev-parse --short HEAD > commit.txt'
          script {
            def commitHash = readFile('commit.txt').trim()
            echo "📝 Current commit: ${commitHash}"
          }
          echo "✅ Code checked out successfully"
        }
      }
    }
    
    stage('Environment Setup') {
      steps {
        echo "🔧 Setting up environment..."
        bat 'node --version'
        bat 'npm --version'
        bat 'docker --version'
        
        // Check if .env file exists
        script {
          if (fileExists("${ENV_FILE_PATH}")) {
            echo "✅ Environment file found at ${ENV_FILE_PATH}"
          } else {
            echo "⚠️ Warning: Environment file not found at ${ENV_FILE_PATH}"
            echo "💡 Make sure to create the .env file for local deployment"
          }
        }
        echo "✅ Environment setup completed"
      }
    }
    
    stage('Install Dependencies') {
      steps {
        echo "📦 Installing dependencies..."
        bat 'npm ci --only=production'
        bat 'npm install --only=dev'
        echo "✅ Dependencies installed successfully"
      }
    }
    
    stage('Code Quality Check') {
      steps {
        echo "🔍 Running code quality checks..."
        script {
          // Check if linting script exists
          def packageJsonContent = readFile('package.json')
          def hasLint = packageJsonContent.contains('"lint"')
          
          if (hasLint) {
            echo "🔍 Running linter..."
            def lintResult = bat(script: 'npm run lint', returnStatus: true)
            if (lintResult != 0) {
              echo "⚠️ Linting issues found - marking build as unstable"
              currentBuild.result = 'UNSTABLE'
            } else {
              echo "✅ Linting passed"
            }
          } else {
            echo "⚠️ No lint script found - skipping linting"
          }
        }
      }
    }
    
    stage('Run Unit Tests') {
      steps {
        echo "🧪 Running unit tests..."
        bat 'npm run test'
        echo "✅ Unit tests completed"
      }
      post {
        always {
          script {
            // Collect test results if they exist
            if (fileExists('test-results') || fileExists('coverage')) {
              junit allowEmptyResults: true, testResults: '**/test-results/*.xml'
              
              // Publish coverage if available
              if (fileExists('coverage')) {
                publishHTML([
                  allowMissing: false,
                  alwaysLinkToLastBuild: true,
                  keepAll: true,
                  reportDir: 'coverage',
                  reportFiles: 'index.html',
                  reportName: 'Coverage Report'
                ])
              }
            }
          }
        }
        failure {
          echo "❌ Unit tests failed"
          error 'Unit tests failed - stopping pipeline'
        }
      }
    }
    
    stage('Run Integration Tests') {
      steps {
        echo "🔗 Checking for integration tests..."
        script {
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
          script {
            if (fileExists('integration-test-results') || fileExists('test-results')) {
              junit allowEmptyResults: true, testResults: '**/integration-test-results/*.xml, **/test-results/*.xml'
            }
          }
        }
      }
    }
    
    stage('Security Scan') {
      steps {
        echo "🔒 Running security audit..."
        script {
          def auditResult = bat(script: 'npm audit --audit-level=high', returnStatus: true)
          if (auditResult != 0) {
            echo "⚠️ Security vulnerabilities found - check npm audit output"
            echo "💡 Run 'npm audit fix' to resolve issues"
            currentBuild.result = 'UNSTABLE'
          } else {
            echo "✅ No high-severity vulnerabilities found"
          }
        }
      }
    }
    
    stage('Build Docker Image') {
      steps {
        echo "🐳 Building Docker image..."
        bat '''
          echo "Building image: %DOCKER_IMAGE%"
          docker build --no-cache -t %DOCKER_IMAGE% -t %DOCKER_IMAGE_LATEST% .
          
          echo "🔍 Verifying image..."
          docker images | findstr "ashnikh78/catalog-service"
          
          echo "📋 Image details:"
          docker inspect %DOCKER_IMAGE% --format="{{.Size}}" > image_size.txt
        '''
        
        script {
          def imageSize = readFile('image_size.txt').trim()
          if (!imageSize?.isNumber()) {
            error "❌ Failed to read image size or it's not a valid number. Value: '${imageSize}'"
          }
          def imageSizeMB = imageSize.toLong() / (1024.0 * 1024.0)
          def imageSizeRounded = String.format("%.2f", imageSizeMB)
          echo "📊 Image size: ${imageSizeRounded} MB"
        }


        echo "✅ Docker image built successfully"
      }
    }
    
    stage('Test Docker Image') {
      steps {
        echo "🧪 Testing Docker image..."
        bat '''
          echo "🔍 Testing image startup..."
          docker run --rm -d --name catalog-service-test -p 3012:3011 %DOCKER_IMAGE%
          
          echo "⏳ Waiting for service to start..."
          ping 127.0.0.1 -n 10 > nul
          
          echo "🏥 Health check..."
          curl -f http://localhost:3012/health || (docker stop catalog-service-test && exit 1)
          
          echo "🛑 Stopping test container..."
          docker stop catalog-service-test
        '''
        echo "✅ Docker image test passed"
      }
    }
    
    stage('Push Docker Image') {
      steps {
        echo "📤 Pushing Docker image to registry..."
        withCredentials([string(credentialsId: '6e06d85c-33ce-40bb-b3e7-e7654a147ba2', variable: 'DOCKER_TOKEN')]) {
          bat '''
            echo "🔐 Logging in to Docker Hub..."
            echo %DOCKER_TOKEN% | docker login %DOCKER_REGISTRY% -u %DOCKER_USER% --password-stdin
            if %errorlevel% neq 0 (
              echo "❌ Docker login failed"
              exit /b 1
            )
            echo "✅ Docker login successful"
            
            echo "📤 Pushing %DOCKER_IMAGE%..."
            docker push %DOCKER_IMAGE%
            if %errorlevel% neq 0 (
              echo "❌ Failed to push %DOCKER_IMAGE%"
              exit /b 1
            )
            echo "✅ Successfully pushed %DOCKER_IMAGE%"
            
            echo "📤 Pushing %DOCKER_IMAGE_LATEST%..."
            docker push %DOCKER_IMAGE_LATEST%
            if %errorlevel% neq 0 (
              echo "❌ Failed to push %DOCKER_IMAGE_LATEST%"
              exit /b 1
            )
            echo "✅ Successfully pushed %DOCKER_IMAGE_LATEST%"
            
            echo "🎉 All images pushed successfully to Docker Hub"
          '''
        }
      }
    }
    
    stage('Deploy Locally') {
      steps {
        echo "🚀 Deploying application locally..."
        bat '''
          echo "🛑 Stopping existing container..."
          docker stop %CONTAINER_NAME% || echo "No existing container to stop"
          docker rm %CONTAINER_NAME% || echo "No existing container to remove"
          
          echo "📥 Pulling latest image..."
          docker pull %DOCKER_IMAGE%
          
          echo "🏃 Starting new container..."
          docker run -d --name %CONTAINER_NAME% --env-file "%ENV_FILE_PATH%" -p %APP_PORT%:%APP_PORT% %DOCKER_IMAGE%
          
          echo "⏳ Waiting for service to start..."
          ping 127.0.0.1 -n 10 > nul
          
          echo "🏥 Health check..."
          curl -f %HEALTH_ENDPOINT% || (
            echo "❌ Health check failed"
            echo "📋 Container logs:"
            docker logs %CONTAINER_NAME%
            exit 1
          )
          
          echo "📊 Container status:"
          docker ps | findstr %CONTAINER_NAME%
          
          echo "✅ Application deployed successfully"
        '''
      }
    }
    
    stage('Post-Deployment Tests') {
      steps {
        echo "🔍 Running post-deployment tests..."
        bat '''
          echo "🏥 Final health check..."
          curl -f %HEALTH_ENDPOINT% || exit 1
          
          echo "📊 Application metrics (if available)..."
          curl -f %HEALTH_ENDPOINT%/metrics || echo "No metrics endpoint available"
          
          echo "🔍 Container resource usage:"
          docker stats %CONTAINER_NAME% --no-stream
        '''
        echo "✅ Post-deployment tests completed"
      }
    }
  }
  
  post {
    always {
      echo "🧹 Cleaning up..."
      bat '''
        docker logout || echo "Already logged out"
        docker system prune -f || echo "No cleanup needed"
      '''
      
      // Clean workspace but keep important files
      script {
        if (fileExists('commit.txt')) {
          archiveArtifacts artifacts: 'commit.txt', allowEmptyArchive: true
        }
      }
      
      cleanWs(cleanWhenNotBuilt: false,
              deleteDirs: true,
              disableDeferredWipeout: true,
              notFailBuild: true)
    }
    
    success {
      echo '🎉 ✅ Build, Test, and Deployment completed successfully!'
      echo "🌐 Application is running at: ${HEALTH_ENDPOINT}"
      
      // Send success notification (optional)
      script {
        def commitHash = readFile('commit.txt').trim()
        def buildInfo = """
        🎉 Deployment Successful!
        
        📝 Build: ${env.BUILD_NUMBER}
        🔗 Commit: ${commitHash}
        🐳 Image: ${DOCKER_IMAGE}
        🌐 Endpoint: ${HEALTH_ENDPOINT}
        ⏰ Duration: ${currentBuild.durationString}
        """
        echo buildInfo
      }
    }
    
    unstable {
      echo '⚠️ Pipeline completed with warnings'
      echo '💡 Check the build logs for issues that need attention'
    }
    
    failure {
      echo '❌ Pipeline failed!'
      echo '🔍 Check the logs above for error details'
      
      // Show container logs if deployment failed
      bat '''
        echo "📋 Container logs (if container exists):"
        docker logs %CONTAINER_NAME% || echo "No container logs available"
        
        echo "🐳 Available images:"
        docker images | findstr "ashnikh78/catalog-service" || echo "No images found"
      '''
    }
  }
}