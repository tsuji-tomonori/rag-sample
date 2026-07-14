import re
from pathlib import Path

WORKFLOW_PATH = Path(".github/workflows/deploy.yml")
PINNED_ACTION = re.compile(r"^\s*uses:\s+[^\s@]+@[0-9a-f]{40}(?:\s+#\s+v\S+)?$", re.MULTILINE)


def workflow() -> str:
    return WORKFLOW_PATH.read_text(encoding="utf-8")


def test_deployment_is_manual_protected_and_serialized() -> None:
    value = workflow()
    trigger = value.split("permissions:", maxsplit=1)[0]
    assert "workflow_dispatch:" in trigger
    assert "type: environment" in trigger
    assert "push:" not in trigger
    assert "pull_request:" not in trigger
    assert "group: rag-engineering-deploy-${{ inputs.environment }}" in value
    assert "cancel-in-progress: false" in value
    assert "Deployments must be dispatched from the main branch." in value
    assert "environment:\n      name: ${{ inputs.environment }}" in value


def test_aws_oidc_permission_is_isolated_to_the_deploy_job() -> None:
    value = workflow()
    verify, deploy = value.split("\n  deploy:\n", maxsplit=1)
    assert "id-token: write" not in verify
    assert "needs: verify" in deploy
    assert "id-token: write" in deploy
    assert "AWS_DEPLOY_ROLE_ARN" in deploy
    assert "AWS_BOOTSTRAP_ROLE_ARN" in deploy
    assert "allowed-account-ids: ${{ vars.AWS_ACCOUNT_ID }}" in deploy
    assert value.count("persist-credentials: false") == 2
    assert deploy.count("unset-current-credentials: true") == 2
    assert deploy.count("role-duration-seconds: 3600") == 2
    assert "npm ci --ignore-scripts" in deploy
    assert "AWS_ACCESS_KEY_ID" not in value
    assert "AWS_SECRET_ACCESS_KEY" not in value


def test_every_external_action_is_immutably_pinned() -> None:
    value = workflow()
    uses_lines = [line for line in value.splitlines() if line.lstrip().startswith("uses:")]
    pinned_lines = PINNED_ACTION.findall(value)
    assert len(uses_lines) == len(pinned_lines)
    assert len(uses_lines) == 10


def test_verification_and_configuration_fail_before_deployment() -> None:
    value = workflow()
    verify, deploy = value.split("\n  deploy:\n", maxsplit=1)
    for command in (
        "uv sync --locked --all-groups",
        "uv run ruff check .",
        "uv run pyright",
        "uv run mypy",
        "npm run lint",
        "npm run typecheck",
        "uv run pytest",
        "npm test",
        "npm run build",
        "uv run app-docs --check",
        "npm run docs:infra:check",
        "npm run synth -w @rag-engineering/infra -- --quiet",
    ):
        assert command in verify
    assert "Validate protected deployment configuration" in deploy
    assert deploy.index("Validate protected deployment configuration") < deploy.index(
        "Configure deployment credentials"
    )


def test_cdk_deploy_uses_explicit_parameters_outputs_and_reconciliation() -> None:
    value = workflow()
    assert "if: ${{ inputs.bootstrap }}" in value
    assert '--cloudformation-execution-policies "${CDK_EXECUTION_POLICY_ARN}"' in value
    assert '--custom-permissions-boundary "${CDK_PERMISSIONS_BOUNDARY_NAME}"' in value
    assert value.count("--require-approval never") == 3
    assert value.count("--no-previous-parameters") == 3
    for parameter in (
        "WebCallbackUrl",
        "WebLogoutUrl",
        "WebOrigin",
        "CognitoDomainPrefix",
        "AlertEmail",
        "MonthlyBudgetUsd",
    ):
        assert value.count(f"${{STACK_NAME}}:{parameter}") == 3
    assert "Provision the initial stack foundation" in value
    assert "Build the production Web asset" in value
    assert "Detect identity endpoint replacement" in value
    assert "Reconcile Web after endpoint replacement" in value
    assert "Verify final deployment outputs" in value
    assert "infra/cdk-outputs.json" in value
