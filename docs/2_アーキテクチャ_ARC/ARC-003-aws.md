---
id: ARC-003
status: accepted
drives: REQ-002, REQ-004, REQ-008
---
# AWS 標準 Knowledge Base

東京リージョンを前提に、暗号化 S3 原文、Titan Text Embeddings V2 (1024 dimensions)、
S3 Vectors index、標準 Bedrock Knowledge Base、S3 data source を CDK で構成する。
Managed Knowledge Base ではなく `S3_VECTORS` を明示する。データ資源は誤削除を防ぐため retain、
public access は全面拒否し、Knowledge Base role は原文 prefix、embedding model、対象 vector
index のみに絞る。deploy は本リポジトリのローカル検証に含めない。

## Lambda bundle 再現性

品質シナリオは、同じsourceとlockを異なるcheckout pathおよびuv versionでbundleした場合に、
全runtime fileとCDK Lambda asset keyが一致することである。失敗モードはinstallerがhost path、
timestamp、tool固有metadataをartifactへ含めることで、受け入れ条件は全file fingerprint一致、
directory差分0件、checkout path残存0件とする。

Lambda bundle ID は `pyproject.toml`、`uv.lock`、packaged `src`、bundle script の内容から導出する。
installer が生成するconsole scripts、local URL、timestamp/cache metadata、それらを参照する
`RECORD` 行はruntime artifactから除外し、checkout pathを含むbundleを拒否する。installはstaging
directoryで完了した場合だけcacheへ原子的に公開する。CDKはこの正規化済みdirectoryをfingerprint
するため、同じsourceとlockのsynth templateは実行hostやuv versionに依存しない。

根拠として、Python Packaging仕様はlocal installの`direct_url.json`が`file:///home/user/project`の
ようなlocal directory URLを記録すると定め、`RECORD`はinstalled fileのpath、content hash、sizeを
保持すると定める。uvの`--target`は指定directory直下へpackageをinstallするため、配備artifact側で
runtime moduleとinstaller bookkeepingを分離する。

- [Direct URL Data Structure](https://packaging.python.org/en/latest/specifications/direct-url-data-structure/)
- [Recording installed projects](https://packaging.python.org/en/latest/specifications/recording-installed-packages/)
- [uv CLI reference: `uv pip install --target`](https://docs.astral.sh/uv/reference/cli/)

代替としてsnapshot内のasset keyだけをmaskする案は実artifactの非再現性を隠すため採用しない。
CDK custom asset hashでbundle IDを強制する案は、異なるbyte列へ同じkeyを与え得るため採用しない。
uv version固定だけではcheckout pathが残るため十分ではない。前提はLambda runtimeがconsole script、
`direct_url.json`、uv cache/build metadataを参照しないことであり、core `METADATA`とentry point定義は
保持する。運用costは初回install時のstaging disk二重化と、cached buildごとの線形path scanである。
