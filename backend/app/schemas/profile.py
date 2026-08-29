import re
from pydantic import BaseModel, Field, field_validator
from typing import Optional


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(None, max_length=255)
    profile_picture: Optional[str] = Field(None, max_length=10000)
    gender: Optional[str] = Field(None, max_length=20)
    age: Optional[int] = Field(None, ge=1, le=150)
    style_objective: Optional[str] = Field(None, max_length=100)

    @field_validator("full_name")
    @classmethod
    def sanitize_full_name(cls, v):
        if v is not None:
            v = re.sub(r'[<>"\'`;\\]', '', v)
            v = v.strip()
            if len(v) < 1:
                return None
        return v

    @field_validator("profile_picture")
    @classmethod
    def validate_profile_picture(cls, v):
        if v is not None and not (v.startswith("data:image/") or v.startswith("http")):
            raise ValueError("Formato de imagem invalido")
        return v

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, v):
        if v is not None and v not in ("", "Masculino", "Feminino", "Neutro"):
            raise ValueError("Genero invalido")
        return v

    @field_validator("style_objective")
    @classmethod
    def sanitize_style_objective(cls, v):
        if v is not None:
            v = re.sub(r'[<>"\'`;\\]', '', v)
            v = v.strip()
        return v


class UserProfileResponse(BaseModel):
    id: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    profile_picture: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None
    style_objective: Optional[str] = None
    role: Optional[str] = None
    plan: Optional[str] = None
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None

    model_config = {"from_attributes": True}
