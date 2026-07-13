# GitHub Actions CD 実装

- 状態: done
- 指示: `tsuji-tomonori/rag-assist` の `.github/workflows/deploy.yml` を参考に、
  本リポジトリへ AWS CDK の継続的デリバリーを実装する。実 AWS への deploy は行わない。

## 受け入れ条件

- [x] 手動 dispatch と GitHub Environment 承認を通過した `main` だけが deploy できる。
- [x] AWS 認証は Environment secret の role ARN と GitHub OIDC を使い、長期 access key を使わない。
- [x] lint、typecheck、test、build、design drift、CDK synth が deploy より前に成功必須となる。
- [x] CDK bootstrap は明示 opt-in と分離 role に限定し、通常 deploy では実行しない。
- [x] スタック固有 parameter と Web の Cognito/AppSync runtime 設定を fail closed で解決する。
- [x] synth と deploy outputs を artifact 化し、同一 Environment の実行を直列化する。
- [x] workflow の event、権限、認証、固定 Action、deploy gate を回帰テストで検証する。
- [x] REQ、ARC、DES、OPS、TRACEABILITY と作業報告が実装に同期する。
- [x] 選定したローカル完了 gate が合格し、deploy/bootstrap/実 AWS API は未実行と記録される。
