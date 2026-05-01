import json
from typing import Optional, List
from .llm import LLMClient
from .models import MealSlot

LOG_PARSER_SYSTEM_PROMPT = """
You are Altus.Log, a specialized data entry parser for endurance athletes.
Your task is to parse a user's natural language journal entry into a structured JSON format.
You only output JSON. Never advise or comment.

IMPORTANT: Always attempt to estimate ALL applicable fields for food entries. 
Endurance athletes need to track:
- Electrolytes: sodium_mg, potassium_mg, calcium_mg
- Performance: caffeine_mg, iron_mg
- Hydration: hydration_ml (also referred to as H2O or water)
- Balance: alcohol_g, fiber_g

Do not leave these fields null if you can provide a reasonable estimate based on the food description.

JSON Schema:
{
  "logs": [
    {
      "type": "food",
      "meal_slot": "Breakfast" | "Lunch" | "Dinner" | "Snack" | "WorkoutFuel",
      "description": string,
      "kcal": number,
      "protein_g": number,
      "carbs_g": number,
      "fat_g": number,
      "fiber_g": number | null,
      "sodium_mg": number | null,
      "alcohol_g": number | null,
      "caffeine_mg": number | null,
      "hydration_ml": number | null,
      "iron_mg": number | null,
      "calcium_mg": number | null,
      "potassium_mg": number | null
    },
    {
      "type": "activity",
      "activity_type": string,
      "duration_min": number,
      "kcal_burned": number
    },
    {
      "type": "health",
      "weight_kg": number | null,
      "hrv": number | null,
      "sleep_hours": number | null
    }
  ],
  "handoff": boolean // Set to true if the user asks a question or seeks advice.
}

If no data is found, return empty logs list.
"""

async def parse_log_message(message: str, api_key: Optional[str] = None, provider: Optional[str] = None, image_b64: Optional[str] = None) -> dict:
    llm = LLMClient(api_key=api_key, provider=provider)
    resp = await llm.complete(message, LOG_PARSER_SYSTEM_PROMPT, image_b64=image_b64)
    # Extract JSON if LLM wraps it in markdown
    if "```json" in resp:
        resp = resp.split("```json")[1].split("```")[0].strip()
    elif "```" in resp:
        resp = resp.split("```")[1].split("```")[0].strip()
    
    try:
        return json.loads(resp)
    except:
        return {"logs": [], "handoff": False}
