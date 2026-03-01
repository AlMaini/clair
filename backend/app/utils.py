import json
import re


def is_url_only(text: str) -> bool:
    """Return True if *text* is nothing but a single HTTP(S) URL."""
    return bool(re.fullmatch(r"https?://[^\s]+", text.strip()))


def parse_llm_json(content: str) -> dict:
    """Parse JSON from an LLM response, tolerating markdown code fences.

    Tries three strategies in order:
      1. Direct JSON parse
      2. Strip ```json ... ``` fences then parse
      3. Extract the first {...} block via regex
    """
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        pass

    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", content)
    if fence:
        try:
            return json.loads(fence.group(1).strip())
        except json.JSONDecodeError:
            pass

    obj = re.search(r"\{[\s\S]*\}", content)
    if obj:
        try:
            return json.loads(obj.group(0))
        except json.JSONDecodeError:
            pass

    raise ValueError(f"No valid JSON found in LLM response: {content[:300]}")
