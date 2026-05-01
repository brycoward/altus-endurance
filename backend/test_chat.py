import httpx
import asyncio

async def test_chat():
    user_id = "00000000-0000-0000-0000-000000000001"
    async with httpx.AsyncClient() as client:
        # Test 1: Simple log
        print("--- Test 1: Simple Log ---")
        r = await client.post("http://localhost:8000/api/log", json={
            "user_id": user_id,
            "message": "I had a sandwich for lunch (600 kcal)"
        })
        print(f"Log response: {r.json()}")

        # Test 2: Log + Question (Handoff)
        print("\n--- Test 2: Log + Question ---")
        r = await client.post("http://localhost:8000/api/log", json={
            "user_id": user_id,
            "message": "I ate a burger. How is my protein intake looking?"
        })
        print(f"Log response: {r.json()}")

if __name__ == "__main__":
    asyncio.run(test_chat())
