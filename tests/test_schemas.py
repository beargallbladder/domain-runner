import json, glob
from jsonschema import Draft202012Validator

def test_schemas_loadable():
    for path in glob.glob("schemas/**/*.json", recursive=True):
        with open(path) as f:
            Draft202012Validator.check_schema(json.load(f))