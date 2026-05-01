import httpx
import asyncio

async def test():
    user_id = "00000000-0000-0000-0000-000000000001"
    async with httpx.AsyncClient() as client:
        # 1. Log food
        r = await client.post("http://localhost:8000/api/food", json={
            "user_id": user_id,
            "meal_slot": "Breakfast",
            "description": "Eggs and Toast",
            "kcal": 500,
            "protein_g": 20,
            "carbs_g": 40,
            "fat_g": 30
        })
        print(f"Food log response: {r.status_code} {r.text}")
        
        # 2. Check snapshot
        r = await client.get(f"http://localhost:8000/api/snapshot/{user_id}/today")
        print(f"Snapshot before goal: {r.text}")

        # 3. Update Goal (Lose 0.5kg/week -> -550 kcal)
        r = await client.put(f"http://localhost:8000/api/goal/{user_id}", json={
            "direction": "lose",
            "weekly_rate_kg": -0.5
        })
        print(f"Goal update response: {r.status_code}")

        # 4. Check snapshot again
        r = await client.get(f"http://localhost:8000/api/snapshot/{user_id}/today")
        print(f"Snapshot after goal: {r.text}")

if __name__ == "__main__":
    asyncio.run(test())
