# Feature Specification: スマホ完結型の注文・会計・呼び出しシステム

**Feature Branch**: `001-`
**Created**: 2025-09-27
**Status**: Draft
**Input**: User description: "@/Users/taniiicom/projects/ar/shin-kojirer/docs/concept.md"

---

## ⚡ Quick Guidelines

- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## User Scenarios & Testing _(mandatory)_

### Primary User Story

来場者は、自身のスマートフォンを使ってQRコードから注文サイトにアクセスし、メニューを選んで注文を完了させる。その後、受付で注文番号を提示して現金で支払いを済ませる。支払いが完了すると注文が厨房に連携され、調理が開始される。調理が完了すると、自分のスマートフォンの画面と場内の呼び出し通知で調理完了を知ることができ、商品を受け取る。これにより、来場者はレジや調理の待ち時間を削減でき、運営側は少ない人的リソースでスムーズな店舗運営を実現できる。

### Acceptance Scenarios

1. **Given** 来場者が注文サイトにアクセスしたとき, **When** メニューとトッピングを選択して注文を確定すると, **Then** 一意の注文番号が発行され、画面に表示される。
2. **Given** 来場者が受付で注文番号を提示したとき, **When** 受付係が代金を受け取り「支払い済み」に更新すると, **Then** 注文ステータスが「調理中」に変わり、受け渡し担当の画面に注文が表示される。
3. **Given** 受け渡し担当が調理を完了したとき, **When** 「調理完了」ボタンを押すと, **Then** 来場者のスマートフォン画面のステータスが「受け取り可」に更新され、呼び出し通知が表示される。
4. **Given** 来場者のステータスが「受け取り可」のとき, **When** 受け渡し場所で注文番号を提示すると, **Then** 商品を受け取ることができる。

### Edge Cases

- **通信不良の場合**: 注文やステータスの更新が失敗した際に、エラーメッセージを表示し、手動での口頭運用に切り替えられるように案内する。
- **端末の電池切れの場合**: 受付や受け渡し担当の端末が使えなくなった際に、手書きの台帳で運用を継続できる。
- **誤操作の場合**: 受付係が誤って「支払い済み」にした場合や、受け渡し係が「調理完了」にした場合に、管理者権限でその操作を取り消すことができる。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: システムは、メニュー、オプション、数量を選択して注文を確定できる機能を提供しなければならない。
- **FR-002**: システムは、注文確定時に一意の注文番号を発行し、表示しなければならない。
- **FR-003**: システムは、注文ステータス（`注文済み` → `支払い済み` → `調理中` → `準備完了` → `提供済み`）をリアルタイムで追跡し、表示しなければならない。
- **FR-004**: システムは、来場者に対して調理完了を画面の強調表示によって通知する機能を提供しなければならない。
- **FR-005**: 受付担当者は、注文番号を検索し、注文内容と合計金額を確認できる機能を持たなければならない。
- **FR-006**: 受付担当者は、注文を「支払い済み」として確定する機能を持たなければならない。
- **FR-007**: 受け渡し担当者は、「支払い済み」の注文を一覧で確認できなければならない。
- **FR-008**: 受け渡し担当者は、注文を「調理完了」および「受け渡し済み」として更新する機能を持たなければならない。
- **FR-009**: 管理者は、メニューや価格、在庫状況を更新できる機能を持たなければならない。
- **FR-010**: システムは、QRコードを読み込むことで、同一端末であれば自身の注文状況を復元できる機能を提供しなければならない。

### Key Entities _(include if feature involves data)_

- **Order (注文)**: 来場者からの注文情報を表す。注文商品、選択オプション、ステータス、タイムスタンプを含む。
- **Menu (メニュー)**: 販売する商品情報を表す。商品名、価格、在庫状況などを含む。
- **Setting (設定)**: 店舗全体の営業状態などを管理する。営業中フラグや在庫数など。

### Non-Functional Requirements

- **NFR-001**: 完了した注文データは無期限に保持されなければならない。
- **NFR-002**: システムは、ピーク時に100人の同時ユーザーを処理できなければならない。
- **NFR-003**: システムは、WCAG 2.1 Level AAへの準拠を目標としなければならない。

---

## Clarifications

### Session 2025-09-27

- Q: 注文ステータスのライフサイクル（状態遷移）についてです。`Order`エンティティは、どのような状態をどのような順序で遷移しますか？ → A: 注文済み → 支払い済み → 調理中 → 準備完了 → 提供済み
- Q: 商品の準備ができた際の「呼び出し通知」についてです。現在、仕様には「画面の強調表示など」と記載されています。画面の強調表示以外に、どのような通知方法を必須としますか？ → A: 画面の強調表示のみ
- Q: 完了した注文のデータは、いつまで保持すべきですか？ → A: 無期限に保持
- Q: このシステムが同時に対応すべき、ピーク時のユーザー数は何人程度を想定していますか？ → A: 100
- Q: Webアクセシビリティについて、特定の基準（例: WCAG 2.1 AAレベル）への準拠は必要ですか？ → A: WCAG 2.1 Level AA への準拠を目標とする

---

## Review & Acceptance Checklist

_GATE: Automated checks run during main() execution_

### Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---
