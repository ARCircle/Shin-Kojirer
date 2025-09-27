<!--
## Sync Impact Report

- **Version change**: none → 1.0.0
- **List of modified principles**:
  - N/A (Initial creation)
- **Added sections**:
  - Core Principles
  - 追加の制約 (Additional Constraints)
  - 開発ワークフロー (Development Workflow)
  - Governance
- **Removed sections**:
  - None
- **Templates requiring updates**:
  - ⚠ pending: /Users/taniiicom/projects/ar/shin-kojirer/.specify/templates/plan-template.md
  - ⚠ pending: /Users/taniiicom/projects/ar/shin-kojirer/.specify/templates/spec-template.md
  - ⚠ pending: /Users/taniiicom/projects/ar/shin-kojirer/.specify/templates/tasks-template.md
  - ⚠ pending: /Users/taniiicom/projects/ar/shin-kojirer/.gemini/commands/analyze.toml
  - ⚠ pending: /Users/taniiicom/projects/ar/shin-kojirer/.gemini/commands/clarify.toml
  - ⚠ pending: /Users/taniiicom/projects/ar/shin-kojirer/.gemini/commands/constitution.toml
  - ⚠ pending: /Users/taniiicom/projects/ar/shin-kojirer/.gemini/commands/implement.toml
  - ⚠ pending: /Users/taniiicom/projects/ar/shin-kojirer/.gemini/commands/plan.toml
  - ⚠ pending: /Users/taniiicom/projects/ar/shin-kojirer/.gemini/commands/specfiy.toml
  - ⚠ pending: /Users/taniiicom/projects/ar/shin-kojirer/.gemini/commands/tasks.toml
- **Follow-up TODOs**:
  - None
-->

# shin-kojirer Constitution

## Core Principles

### 原則1：ライブラリファースト

すべての機能は、明確なドキュメントを備え、単体で完結し、独立してテスト可能なライブラリとして開発を始めます。

### 原則2：CLIインターフェース

すべてのライブラリは、コマンドラインインターフェース（CLI）を通じて機能を提供しなければなりません。テキストベースの入出力（標準入力/引数 → 標準出力、エラーは標準エラー出力）を用います。

### 原則3：テストファースト

テスト駆動開発（TDD）を義務付けます。実装に着手する前にテストを作成し、そのテストが失敗することを確認してから開発を進め、レッド・グリーン・リファクターのサイクルを厳守します。

### 原則4：統合テスト

新しいライブラリの仕様、既存仕様の変更、サービス間通信、共通スキーマなどには統合テストが必須です。

### 原則5：シンプルさ

常に最もシンプルな解決策から着手し、「YAGNI」（You Ain't Gonna Need It - それはまだ必要ない）の原則に従います。時期尚早な最適化や不要な複雑化は避けてください。

## 追加の制約

現時点では特になし。

## 開発ワークフロー

すべてのコード変更は、プルリクエストを通じてレビューされる必要があります。

## Governance

すべてのプルリクエストとレビューは、この憲法の原則に準拠しているか検証する必要があります。

**Version**: 1.0.0 | **Ratified**: 2025-09-27 | **Last Amended**: 2025-09-27
