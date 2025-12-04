# Repository Guidelines

## Project Structure & Module Organization
- `terraform/`: Infrastructure as code. `_backend.tf` defines the remote S3 state bucket, key, and DynamoDB lock table. Add additional modules here and keep state configuration separate from resources.
- `.devcontainer/`: Development container config with Python, Terraform CLI, AWS CLI, and Node.js for Codex tooling.
- `README.md`: High-level repo entry point. Update alongside major infra changes to keep new contributors oriented.

## Build, Test, and Development Commands
- `terraform init`: Initialize providers and download modules. Run after cloning or changing providers/backends.
- `terraform fmt -recursive`: Normalize formatting across all Terraform files.
- `terraform validate`: Static validation of syntax and provider schemas; run before plans.
- `terraform plan -out plan.tfplan`: Show proposed changes; save the plan for review or later apply.
- `terraform apply plan.tfplan`: Apply a reviewed plan. Avoid `apply` without a saved plan in shared environments.

## Coding Style & Naming Conventions
- Terraform: Use `terraform fmt` defaults (2-space indents). Prefer explicit resource names (e.g., `aws_s3_bucket.state`) and lowercase with underscores for variables/outputs.
- Files: Keep backend configuration in `_backend.tf`; group resources by domain (networking, data, compute) into dedicated files or modules.
- Variables/Outputs: Provide descriptions; default to least-privilege IAM policies and parameterize region/profile when possible.

## Testing Guidelines
- Use `terraform validate` as the minimum gate. For behavioral checks, run `terraform plan` against a non-production workspace.
- Naming: Test workspaces with clear prefixes (e.g., `dev-<init>`). Avoid pointing at production credentials for local runs.
- Optional: If adding modules, include `examples/` or `README` snippets showing expected inputs/outputs and sample `terraform plan` output.

## Commit & Pull Request Guidelines
- Commits: Use concise, imperative messages (e.g., `add s3 backend lock table`); group related resource changes together. Avoid mixing refactors with functional changes.
- Pull Requests: Include a summary of resource changes and risks, link issues, and paste `terraform plan` output (redacted if sensitive). Mention any manual steps (state migrations, workspace changes) required post-merge.

## Security & Configuration Tips
- Secrets: Do not commit AWS keys or `terraform.tfstate` artifacts. Keep remote state locked via the configured DynamoDB table.
- Access: Verify `AWS_PROFILE` and `AWS_REGION` in your environment or `.devcontainer` defaults before running plans.
- State changes: For backend/key modifications, coordinate with maintainers and run `terraform init -migrate-state` with backups in place.
