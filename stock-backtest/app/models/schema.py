from pydantic import BaseModel
from typing import List

class BacktestResponse(BaseModel):
    symbol: str
    final_return: float
    history: List[float]