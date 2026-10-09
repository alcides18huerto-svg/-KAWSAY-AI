from abc import ABC, abstractmethod
class AIProvider(ABC):
    @abstractmethod
    def generate(self, context: dict) -> dict: ...
class AIGateway:
    def __init__(self, provider: AIProvider): self.provider=provider
    def generate(self, context: dict): return self.provider.generate(context)
