def detect_support_pattern(attempts: list[dict]) -> dict | None:
    recent=attempts[-5:]
    if len(recent)>=5 and sum(1 for x in recent if not x.get("is_correct"))>=4:
        return {"type":"LEARNING_SUPPORT","evidence":"4 o más errores en los últimos 5 intentos"}
    return None
