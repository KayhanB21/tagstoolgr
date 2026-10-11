"""Package only runtime assets; the source photo and development files stay local."""
import json
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root = Path(__file__).resolve().parent.parent
manifest = json.loads((root / 'manifest.json').read_text())
out = root / 'dist' / f"tagstoolgr-{manifest['version']}.xpi"
out.parent.mkdir(exist_ok=True)
with ZipFile(out, 'w', ZIP_DEFLATED) as archive:
    archive.write(root / 'manifest.json', 'manifest.json')
    for folder in ('src', 'popup', 'icons'):
        for path in sorted((root / folder).rglob('*')):
            if path.is_file() and not path.name.startswith('.'):
                archive.write(path, path.relative_to(root))
print(out)
