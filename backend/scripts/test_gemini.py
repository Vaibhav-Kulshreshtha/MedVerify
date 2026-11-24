"""Integration checks for optional AI explanations. All provider calls are mocked."""

import json
import sys
import unittest
from collections import deque
from pathlib import Path
from unittest.mock import AsyncMock, patch

import httpx
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import config, gemini
from app.main import app


class ExplanationTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.addCleanup(self.client.close)
        self.image = Path(__file__).resolve().parents[1] / "demo_test_images/dolo650_genuine.png"
        self.report = {
            "verdict": "INCONCLUSIVE",
            "confidence": 0.5,
            "sharpness_score": 70.0,
            "edge_quality_score": 65.0,
            "ocr_extracted_text": "private sample label",
            "extracted_fields": {"batch_number": "private batch"},
            "flags": [{"severity": "medium", "issue": "private flag text"}],
            "verdict_disclaimer": "Packaging screening only.",
        }
        analysis = patch("app.main.analyze_packaging_image", return_value=self.report)
        analysis.start()
        self.addCleanup(analysis.stop)
        times = patch.object(gemini, "_request_times", deque())
        times.start()
        self.addCleanup(times.stop)

    def scan(self, **form):
        response = self.client.post(
            "/analyze", data=form,
            files={"image": ("private filename.png", self.image.read_bytes(), "image/png")},
        )
        self.assertEqual(response.status_code, 200)
        return response.json()

    def test_default_and_missing_key_make_no_provider_call(self):
        with patch.object(httpx.AsyncClient, "post") as post:
            with patch.object(config, "GEMINI_API_KEY", "test-credential"):
                self.assertIsNone(self.scan().get("ai_explanation"))
            with patch.object(config, "GEMINI_API_KEY", ""):
                self.assertEqual(self.scan(include_ai="true")["ai_explanation"]["status"], "not_configured")
            post.assert_not_called()

    def test_opt_in_explains_metrics_only(self):
        response = httpx.Response(200, request=httpx.Request("POST", "https://example.invalid"), json={
            "candidates": [{"finishReason": "STOP", "content": {"parts": [
                {"thought": True, "text": "private reasoning"}, {"text": "Try a clearer photo."},
            ]}}],
        })
        with patch.object(config, "GEMINI_API_KEY", "test-credential"), patch.object(
            httpx.AsyncClient, "post", new_callable=AsyncMock, return_value=response,
        ) as post:
            result = self.scan(include_ai="true")
        self.assertEqual(result["ai_explanation"], {"status": "generated", "summary": "Try a clearer photo."})
        url = post.call_args.args[0]
        self.assertTrue(url.startswith("https://generativelanguage.googleapis.com/"))
        self.assertNotIn("test-credential", url)
        self.assertEqual(post.call_args.kwargs["headers"]["x-goog-api-key"], "test-credential")
        body = post.call_args.kwargs["json"]
        self.assertNotIn("private", json.dumps(body))
        self.assertEqual(len(body["contents"][0]["parts"]), 1)
        metrics = json.loads(body["contents"][0]["parts"][0]["text"])
        self.assertEqual(metrics["screening_verdict"], self.report["verdict"])
        self.assertIsNone(metrics["expiry_in_past"])

    def test_provider_errors_preserve_the_report(self):
        request = httpx.Request("POST", "https://example.invalid")
        responses = [
            httpx.Response(429, request=request), httpx.Response(200, json={}, request=request),
            httpx.Response(200, content=b"invalid", request=request),
            httpx.Response(200, json={"candidates": [{"finishReason": "SAFETY"}]}, request=request),
        ]
        with patch.object(config, "GEMINI_API_KEY", "test-credential"), patch.object(
            httpx.AsyncClient, "post", side_effect=[*responses, httpx.ReadTimeout("test timeout")],
        ):
            for _ in range(len(responses) + 1):
                result = self.scan(include_ai="true")
                self.assertEqual(result["verdict"], "INCONCLUSIVE")
                self.assertEqual(result["flags"][0]["issue"], "private flag text")
                self.assertEqual(result["ai_explanation"]["status"], "unavailable")

    def test_rate_limited_scans_keep_their_verdict(self):
        with patch.object(gemini, "_MAX_CALLS_PER_MINUTE", 1), patch.object(
            config, "GEMINI_API_KEY", "test-credential",
        ), patch.object(httpx.AsyncClient, "post", side_effect=httpx.ConnectError("offline")) as post:
            with patch.object(gemini, "monotonic", return_value=10.0):
                self.scan(include_ai="true")
                result = self.scan(include_ai="true")
                self.assertEqual(result["verdict"], self.report["verdict"])
                self.assertEqual(result["ai_explanation"]["status"], "unavailable")
                self.assertEqual(post.call_count, 1)
            with patch.object(gemini, "monotonic", return_value=71.0):
                self.scan(include_ai="true")
                self.assertEqual(post.call_count, 2)


if __name__ == "__main__":
    unittest.main()
