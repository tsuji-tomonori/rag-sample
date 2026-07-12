from tools.operation_layout import assert_layout


def main() -> int:
    """RAG外部store構成ではCRUD生成対象がないためoperation境界だけを検証する。"""
    assert_layout()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
