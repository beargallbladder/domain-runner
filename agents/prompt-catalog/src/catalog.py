import datetime, json, uuid
from typing import Dict, Any, List

class PromptCatalog:
    def __init__(self):
        self.catalog = {}       # {prompt_id: latest_prompt}
        self.versions = []      # append-only list of all versions

    def add_prompt(self, prompt: Dict[str, Any]):
        if "safety_tags" not in prompt or not prompt["safety_tags"]:
            raise ValueError("safety_tags required")
        prompt = prompt.copy()
        prompt["created_at"] = prompt.get("created_at") or datetime.datetime.utcnow().isoformat()
        if prompt["prompt_id"] in self.catalog:
            raise ValueError("prompt already exists, use update")
        self.catalog[prompt["prompt_id"]] = prompt
        self.versions.append(prompt)
        return prompt

    def update_prompt(self, prompt_id: str, new_text: str):
        if prompt_id not in self.catalog:
            raise ValueError("prompt not found")
        old = self.catalog[prompt_id]
        major, minor, patch = map(int, old["version"].split("."))
        new_version = f"{major}.{minor+1}.{patch}"
        new_prompt = old.copy()
        new_prompt["text"] = new_text
        new_prompt["version"] = new_version
        new_prompt["created_at"] = datetime.datetime.utcnow().isoformat()
        self.catalog[prompt_id] = new_prompt
        self.versions.append(new_prompt)
        return new_prompt

    def get_prompt(self, prompt_id: str):
        return self.catalog.get(prompt_id)

    def get_history(self, prompt_id: str) -> List[Dict[str, Any]]:
        return [p for p in self.versions if p["prompt_id"] == prompt_id]