"""Publish a validated reference photo and its catalog entry together."""

from contextlib import contextmanager
import hashlib
import json
import os
from pathlib import Path
from tempfile import NamedTemporaryFile

import cv2

from app import cv_analyzer


@contextmanager
def _catalog_lock(root):
    # All workers lock this stable file; the catalog itself is replaced atomically.
    with (root / ".brands.lock").open("a+b") as lock:
        if os.name == "nt":
            import msvcrt
            lock.seek(0)
            msvcrt.locking(lock.fileno(), msvcrt.LK_LOCK, 1)
        else:
            import fcntl
            fcntl.flock(lock, fcntl.LOCK_EX)
        yield  # Closing the handle releases the lock on either platform.


def _replace_bytes(path: Path, data: bytes) -> None:
    tmp = NamedTemporaryFile(dir=path.parent, delete=False)
    temp_path = Path(tmp.name)
    try:
        with tmp:
            tmp.write(data)
            tmp.flush()
            os.fsync(tmp.fileno())
        os.replace(temp_path, path)
    finally:
        temp_path.unlink(missing_ok=True)


def save_reference(file_bytes: bytes, brand_id: str, brand_name: str, manufacturer: str) -> str:
    image = cv_analyzer.decode_image_bytes(file_bytes)
    ok, encoded = cv2.imencode(".png", image)
    if not ok:
        raise ValueError("Unable to encode the reference photo.")

    image_bytes = encoded.tobytes()
    rel_path = Path(brand_id) / (hashlib.sha256(image_bytes).hexdigest() + ".png")
    root = next((Path(p).resolve() for p in cv_analyzer.REFERENCE_DIRS
                 if (Path(p) / "brands.json").is_file()), None)
    if root is None:
        raise OSError("Reference catalog is missing.")

    with _catalog_lock(root):
        catalog_path = root / "brands.json"
        try:
            catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
            brands = catalog["brands"]
            if not isinstance(brands, list) or not all(isinstance(b, dict) for b in brands):
                raise TypeError("Invalid brands list")
        except (ValueError, KeyError, TypeError) as exc:
            raise OSError("Invalid reference catalog.") from exc

        # Immutable image names keep the previous catalog usable throughout an update.
        folder = root / brand_id
        if folder.is_symlink():
            raise OSError("Invalid reference directory.")
        folder.mkdir(exist_ok=True)
        target = root / rel_path
        if target.is_symlink() or not target.is_file():
            _replace_bytes(target, image_bytes)

        entry = next((b for b in brands if b.get("id") == brand_id), None)
        if entry is None:
            entry = {"id": brand_id, "lot_prefix": brand_id[:4].upper(), "color_theme": "#0F2A3F"}
            brands.append(entry)
        name = brand_name or entry.get("name") or brand_id
        mfg = manufacturer or entry.get("manufacturer") or "Unspecified"
        if brand_name or manufacturer or not entry.get("fullName"):
            entry["fullName"] = f"{name} ({mfg})"
        entry.update(name=name, manufacturer=mfg, reference_image=rel_path.as_posix())
        _replace_bytes(catalog_path, (json.dumps(catalog, indent=2) + "\n").encode("utf-8"))

    return rel_path.as_posix()
