from tools.api_docs import check_outputs, render_outputs


def main() -> int:
    return check_outputs(render_outputs(("sequence",)))


if __name__ == "__main__":
    raise SystemExit(main())
