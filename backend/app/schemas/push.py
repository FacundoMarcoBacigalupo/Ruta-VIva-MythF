from pydantic import BaseModel, Field


class SubscribePayload(BaseModel):
    endpoint: str = Field(min_length=10, max_length=500)
    p256dh: str = Field(min_length=10, max_length=255)
    auth: str = Field(min_length=5, max_length=255)
    saved_route_id: int | None = None


class UnsubscribePayload(BaseModel):
    endpoint: str = Field(min_length=10, max_length=500)


class VapidPublicKeyResponse(BaseModel):
    public_key: str
