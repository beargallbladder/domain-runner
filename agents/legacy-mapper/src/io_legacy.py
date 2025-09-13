import json
import csv
from typing import Dict, Any, List, Generator, Optional
from pathlib import Path

class LegacyReader:
    """Base class for reading legacy data sources."""

    def read_batch(self, start_offset: int = 0, batch_size: int = 2000) -> Generator[List[Dict[str, Any]], None, None]:
        """Read legacy data in batches."""
        raise NotImplementedError

class NDJSONReader(LegacyReader):
    """Read legacy data from NDJSON (newline-delimited JSON) files."""

    def __init__(self, file_path: str):
        self.file_path = Path(file_path)
        if not self.file_path.exists():
            raise FileNotFoundError(f"Legacy file not found: {file_path}")

    def read_batch(self, start_offset: int = 0, batch_size: int = 2000) -> Generator[List[Dict[str, Any]], None, None]:
        """Read NDJSON file in batches."""
        with open(self.file_path, 'r') as f:
            batch = []
            line_num = 0

            for line in f:
                if line_num < start_offset:
                    line_num += 1
                    continue

                try:
                    row = json.loads(line.strip())
                    batch.append(row)
                except json.JSONDecodeError as e:
                    # Log malformed lines but continue
                    print(f"Warning: Malformed JSON at line {line_num + 1}: {e}")

                if len(batch) >= batch_size:
                    yield batch
                    batch = []

                line_num += 1

            # Yield remaining rows
            if batch:
                yield batch

class CSVReader(LegacyReader):
    """Read legacy data from CSV files."""

    def __init__(self, file_path: str):
        self.file_path = Path(file_path)
        if not self.file_path.exists():
            raise FileNotFoundError(f"Legacy file not found: {file_path}")

    def read_batch(self, start_offset: int = 0, batch_size: int = 2000) -> Generator[List[Dict[str, Any]], None, None]:
        """Read CSV file in batches."""
        with open(self.file_path, 'r', newline='') as f:
            reader = csv.DictReader(f)
            batch = []
            row_num = 0

            for row in reader:
                if row_num < start_offset:
                    row_num += 1
                    continue

                batch.append(dict(row))  # Convert OrderedDict to regular dict

                if len(batch) >= batch_size:
                    yield batch
                    batch = []

                row_num += 1

            # Yield remaining rows
            if batch:
                yield batch

class MockLegacyReader(LegacyReader):
    """Mock reader for testing with synthetic data."""

    def __init__(self, data: List[Dict[str, Any]]):
        self.data = data

    def read_batch(self, start_offset: int = 0, batch_size: int = 2000) -> Generator[List[Dict[str, Any]], None, None]:
        """Return mock data in batches."""
        for i in range(start_offset, len(self.data), batch_size):
            yield self.data[i:i + batch_size]

def get_reader(source_type: str, source_path: Optional[str] = None, mock_data: Optional[List] = None) -> LegacyReader:
    """Factory function to get appropriate reader based on source type."""
    if source_type == "ndjson":
        return NDJSONReader(source_path)
    elif source_type == "csv":
        return CSVReader(source_path)
    elif source_type == "mock":
        return MockLegacyReader(mock_data or [])
    else:
        raise ValueError(f"Unsupported source type: {source_type}")