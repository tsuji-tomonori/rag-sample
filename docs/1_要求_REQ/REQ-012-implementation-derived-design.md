---
id: REQ-012
status: confirmed
source: user objective and lazunex/rag-assist reference automation
---
# Implementation-derived design

backend、Web、infraの設計artifactは実装・typed contract・synthesized templateから再現生成し、
手編集によるdriftをCIで拒否する。

## 受け入れ条件

- backendはOpenAPI、API一覧、detail、sequence、message catalog、test factorsを生成する。
- runtime operation IDとoperation contractの過不足を拒否する。
- Webはview/action/endpoint/permission/state/auth/realtime contractとcomponent labelを照合する。
- infraはresource count、logical resource、retention、parameter、output、IAM actionを生成する。
- `task docs:check` とCIが全生成物とrepository skillsのdriftを検出する。
