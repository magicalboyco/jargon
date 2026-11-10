"""Build the Cloudflare Worker from the same pure engine and dictionary as local Jargon.

No downloads, external fonts, analytics, or third-party word validation.
The output is a single ES module for Workers. Matches use SQLite Durable Objects.
"""
from pathlib import Path

root = Path(__file__).resolve().parents[1]
parts = ["src/engine.js", "src/dictionary.js"]
parts += [f"src/enable/{letter}.js" for letter in "ABCDEFGHIJKLMNOPQRSTUVWXYZ"]
parts += ["src/dictionary-finalize.js", "online/worker-source.js"]
output = (
    "import { DurableObject } from 'cloudflare:workers';\n"
    + "\n".join((root / name).read_text(encoding="utf-8") for name in parts)
)
assert "export class JargonMatch extends DurableObject" in output
assert "function viewFor(" in output
assert "function validWord(" in output
assert "MATCH_CREATION_ENABLED" in output
target = root / "online/dist/worker.mjs"
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(output + "\n", encoding="utf-8")
print(f"Built {target.relative_to(root)}: {len(output)} bytes")
