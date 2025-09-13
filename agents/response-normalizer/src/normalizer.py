import json
from typing import Dict, Any

class ResponseNormalizer:
    def normalize(self, row: Dict[str, Any]) -> Dict[str, Any]:
        raw = row.get("raw","")
        parsed = {"answer": "", "confidence": None, "citations": []}
        status = "valid"
        try:
            data = json.loads(raw)
            if isinstance(data, dict) and "answer" in data:
                parsed["answer"] = str(data["answer"]).strip()
                if "confidence" in data:
                    try:
                        c = float(data["confidence"])
                        parsed["confidence"] = min(max(c,0.0),1.0)
                    except:
                        pass
                if "citations" in data and isinstance(data["citations"], list):
                    parsed["citations"] = list(dict.fromkeys([str(c).strip() for c in data["citations"]]))
            else:
                # fallback: raw plain text
                parsed["answer"] = str(raw).strip()
        except Exception:
            # fallback: plain text
            parsed["answer"] = str(raw).strip()
            if not parsed["answer"] or raw.startswith("{"):
                status = "malformed"

        if parsed["answer"] == "":
            status = "empty"

        return {
            "id": row["id"],
            "domain": row["domain"],
            "prompt_id": row["prompt_id"],
            "model": row["model"],
            "ts_iso": row["ts_iso"],
            "answer": parsed["answer"],
            "confidence": parsed["confidence"],
            "citations": parsed["citations"],
            "normalized_status": status,
            "raw_ref": row["id"]
        }