from fastapi import HTTPException, UploadFile
from starlette.datastructures import Headers
from starlette.responses import JSONResponse

MAX_FILE_SIZE = 15 * 1024 * 1024
# Allow room for multipart boundaries and form fields around a maximum-size photo.
MAX_REQUEST_SIZE = MAX_FILE_SIZE + 64 * 1024


class UploadSizeLimit:
    """Enforce the total request bound while the multipart parser consumes the stream."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope["method"] != "POST":
            return await self.app(scope, receive, send)
        length = Headers(scope=scope).get("content-length")
        if length and length.isdecimal() and int(length) > MAX_REQUEST_SIZE:
            response = JSONResponse({"detail": "Upload exceeds the 15 MiB photo limit."}, status_code=413)
            return await response(scope, receive, send)

        total = 0

        async def limited_receive():
            nonlocal total
            message = await receive()
            total += len(message.get("body", b""))
            if total > MAX_REQUEST_SIZE:
                raise HTTPException(413, "Upload exceeds the 15 MiB photo limit.")
            return message

        await self.app(scope, limited_receive, send)


async def read_photo(image: UploadFile) -> bytes:
    if not image.filename:
        raise HTTPException(400, "Uploaded file must have a filename.")
    if image.content_type and image.content_type.lower() not in (
        "image/jpeg", "image/png", "image/webp", "application/octet-stream",
    ):
        raise HTTPException(415, "Upload a JPEG, PNG, or WebP image.")
    if image.size is not None and image.size > MAX_FILE_SIZE:
        raise HTTPException(413, "Photo exceeds the 15 MiB upload limit.")
    contents = await image.read(MAX_FILE_SIZE + 1)
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(413, "Photo exceeds the 15 MiB upload limit.")
    if not contents:
        raise HTTPException(400, "The uploaded photo is empty.")
    return contents
