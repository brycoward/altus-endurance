import os
import httpx
from typing import Optional

class LLMClient:
    def __init__(self, api_key: Optional[str] = None, provider: Optional[str] = None):
        self.provider = provider or os.getenv("LLM_PROVIDER", "anthropic")
        self.api_key = api_key or os.getenv("LLM_API_KEY")

    async def complete(self, prompt: str, system_prompt: str = "", image_b64: Optional[str] = None) -> str:
        if not self.api_key:
            return "AI placeholder: No API key configured."

        if self.provider == "anthropic":
            return await self._anthropic_complete(prompt, system_prompt)
        elif self.provider == "openai":
            return await self._openai_complete(prompt, system_prompt)
        elif self.provider == "google":
            return await self._gemini_complete(prompt, system_prompt, image_b64)
        return f"Unsupported LLM provider: {self.provider}"

    async def _gemini_complete(self, prompt: str, system_prompt: str, image_b64: Optional[str]) -> str:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={self.api_key}"
        parts = [{"text": prompt}]
        
        if image_b64:
            parts.append({
                "inlineData": {
                    "mimeType": "image/jpeg",
                    "data": image_b64
                }
            })

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                url,
                headers={"Content-Type": "application/json"},
                json={
                    "contents": [{"parts": parts}],
                    "system_instruction": {"parts": [{"text": system_prompt}]} if system_prompt else None
                },
                timeout=30.0
            )
            resp.raise_for_status()
            data = resp.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]

    async def _anthropic_complete(self, prompt: str, system_prompt: str) -> str:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": "claude-3-haiku-20240307",
                    "max_tokens": 512,
                    "system": system_prompt,
                    "messages": [{"role": "user", "content": prompt}]
                },
                timeout=30.0
            )
            resp.raise_for_status()
            return resp.json()["content"][0]["text"]

    async def _openai_complete(self, prompt: str, system_prompt: str) -> str:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "gpt-3.5-turbo",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt}
                    ]
                },
                timeout=30.0
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]
