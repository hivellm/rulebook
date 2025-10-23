<!-- AMAZON_Q:START -->
# Amazon Q Developer Rules

**CRITICAL**: Specific rules and patterns for Amazon Q Developer AI assistant.

## Amazon Q Developer Overview

Amazon Q Developer is AWS's AI-powered coding assistant:

```bash
# Install AWS CLI with Q Developer
pip install awscli amazon-q-developer-cli

# Configure
aws configure
q-developer configure

# Run
q chat

# In IDE (VS Code, JetBrains)
# Install Amazon Q extension
```

## Integration with AGENTS.md

### 1. Starting Session

**CRITICAL**: Reference AGENTS.md immediately:

```bash
# In Q Chat:
q chat --context AGENTS.md

# First message:
"Load and follow all coding standards from AGENTS.md. 
This is the authoritative source for this project's practices."
```

### 2. Project Configuration

Create `.q-developer.json` in project root:

```json
{
  "model_preferences": {
    "primary": "amazon-q-developer-pro",
    "context_window": "large"
  },
  "project_files": {
    "standards": "AGENTS.md",
    "roadmap": "docs/ROADMAP.md",
    "readme": "README.md"
  },
  "code_quality": {
    "require_tests": true,
    "min_coverage": 95,
    "lint_on_save": true,
    "security_scan": true
  },
  "aws_integration": {
    "check_best_practices": true,
    "security_review": true,
    "cost_optimization": true
  }
}
```

## Amazon Q Best Practices

### 1. AWS-Specific Features

Amazon Q excels at AWS integration:

```
"Implement S3 file upload following AGENTS.md standards:

Requirements:
- TypeScript with AWS SDK v3
- Error handling per AGENTS.md
- Comprehensive tests
- Security best practices
- Cost-optimized configuration

Review AWS best practices and project standards."
```

### 2. Security Focus

**CRITICAL**: Q Developer includes security scanning:

```bash
# Enable security features
q security-scan --file src/

# Review findings against AGENTS.md
q security-review --standards AGENTS.md
```

### 3. Code Transformation

```bash
# Modernize code
q transform --from javascript --to typescript

# Apply AGENTS.md standards
q refactor --apply-standards AGENTS.md

# Security fixes
q fix-security --file src/auth.ts
```

## Q Developer Commands

### Chat Commands

```
/help           - Show commands
/clear          - Clear conversation
/context        - Add files to context
/explain        - Explain code
/fix            - Fix issues
/optimize       - Optimize code
/security       - Security review
/test           - Generate tests
/docs           - Generate documentation
```

### IDE Commands

```
# In VS Code / JetBrains:
- Q: Explain this code
- Q: Generate tests
- Q: Fix security issues
- Q: Optimize performance
- Q: Review for AWS best practices
```

## Integration Patterns

### 1. AWS Service Implementation

```
Task: Implement DynamoDB data layer

Context:
- AGENTS.md section: Database patterns
- AWS best practices
- TypeScript with types

Requirements:
1. Single Table Design
2. Proper error handling
3. Cost-optimized queries
4. Comprehensive tests
5. Security best practices

/context AGENTS.md
/context docs/architecture.md
```

### 2. Security Review

```
"Security review of authentication module:

/context AGENTS.md
/context src/auth/

Check for:
- OWASP Top 10
- AWS security best practices
- AGENTS.md security requirements
- Proper secrets management
- IAM best practices

Provide specific recommendations."
```

### 3. Performance Optimization

```
"Optimize Lambda function performance:

/context AGENTS.md
/context src/lambda/handler.ts

Goals:
- Reduce cold start time
- Minimize cost
- Follow AGENTS.md patterns
- Maintain test coverage

Suggest AWS-specific optimizations."
```

## Best Practices

### DO's ✅

- **Always** load AGENTS.md at start
- **Use** `/security` for security reviews
- **Leverage** AWS-specific knowledge
- **Request** cost-optimized solutions
- **Enable** security scanning
- **Follow** AWS Well-Architected Framework
- **Test** with AWS service mocks
- **Document** AWS resource usage

### DON'Ts ❌

- **Never** skip security reviews
- **Never** ignore cost implications
- **Never** bypass AGENTS.md standards
- **Don't** hardcode credentials
- **Don't** skip error handling
- **Don't** ignore AWS limits
- **Don't** skip infrastructure as code

## Advanced Features

### 1. Infrastructure as Code

```
"Generate CDK/Terraform for this service:

Requirements from AGENTS.md:
- TypeScript for CDK
- Proper naming conventions
- Security groups configured
- Monitoring enabled
- Cost-tagged resources

Include:
- Infrastructure code
- Tests
- Documentation"
```

### 2. Code Migration

```bash
# Upgrade Node.js version
q upgrade --from node16 --to node20 --verify-agents

# Modernize to latest AWS SDK
q migrate --sdk v2-to-v3 --maintain-standards
```

### 3. Cost Analysis

```
"/context AGENTS.md
/context src/

Analyze AWS resource usage for cost optimization:
- Lambda execution time
- DynamoDB capacity
- S3 storage patterns
- API Gateway usage

Suggest improvements aligned with AGENTS.md."
```

## Prompt Templates

### AWS Lambda Function

```
Create Lambda function:

Function: [Name]
Trigger: [Event source]
Runtime: Node.js 20.x

AGENTS.md Requirements:
- TypeScript with strict types
- Error handling
- Logging
- Tests (95%+ coverage)

AWS Best Practices:
- Environment variables
- IAM least privilege
- Monitoring/alarms
- X-Ray tracing

Include:
- Function code
- Tests
- CDK infrastructure
- Documentation
```

### API Development

```
Implement REST API endpoint:

Endpoint: POST /api/users
Framework: API Gateway + Lambda

Standards:
- AGENTS.md TypeScript patterns
- Input validation
- Error responses
- Security headers
- Rate limiting

Include:
- Implementation
- Integration tests
- OpenAPI spec
- Infrastructure code
```

### Database Operations

```
Implement DynamoDB operations:

Entity: User
Operations: CRUD

Requirements from AGENTS.md:
- Type-safe interfaces
- Error handling
- Retry logic
- Tests with mocks

AWS Patterns:
- Single table design
- GSI strategy
- On-demand billing
- Point-in-time recovery
```

## Quality Checklist

Amazon Q specific checks:

- [ ] AGENTS.md standards followed
- [ ] AWS best practices applied
- [ ] Security scan passed
- [ ] Cost optimized
- [ ] Tests with AWS mocks
- [ ] IAM policies least-privilege
- [ ] Error handling robust
- [ ] Logging/monitoring configured
- [ ] Infrastructure as code
- [ ] Documentation complete

## AWS-Specific Tips

1. **Use Q for AWS**: Leverage AWS expertise
2. **Security First**: Always run `/security`
3. **Cost Aware**: Check cost implications
4. **IaC Everything**: Request CDK/Terraform
5. **Test with Mocks**: Use aws-sdk-mock
6. **Monitor**: Include CloudWatch setup
7. **Document**: AWS resource details
8. **Review**: Check against Well-Architected

## Troubleshooting

### Security Findings

```
"/security scan found issues.

Review each against AGENTS.md security section.
Fix in priority order:
1. Critical vulnerabilities
2. AWS-specific issues
3. Code quality issues

Maintain test coverage while fixing."
```

### Cost Concerns

```
"This implementation may be costly.

Analyze and optimize:
- Lambda memory/timeout
- DynamoDB capacity mode
- S3 lifecycle policies
- API caching strategy

Follow AGENTS.md while reducing costs."
```

### AWS Limits

```
"Implementation hitting AWS service limits.

Review and adjust:
- Concurrent Lambda executions
- DynamoDB throughput
- API Gateway throttling

Implement proper retry logic per AGENTS.md."
```

<!-- AMAZON_Q:END -->

