import re
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional


class UserBase(BaseModel):
    email: EmailStr = Field(..., max_length=255)
    full_name: Optional[str] = Field(None, max_length=255)

    @field_validator("full_name")
    @classmethod
    def sanitize_full_name(cls, v):
        if v is not None:
            v = re.sub(r'[<>"\'`;\\]', '', v)
            v = v.strip()
        return v


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v):
        if not any(c.isupper() for c in v):
            raise ValueError("A senha deve conter pelo menos uma letra maiuscula")
        if not any(c.islower() for c in v):
            raise ValueError("A senha deve conter pelo menos uma letra minuscula")
        if not any(c.isdigit() for c in v):
            raise ValueError("A senha deve conter pelo menos um numero")
        return v


class UserResponse(UserBase):
    id: str
    is_active: bool
    is_verified: bool
    role: str = "client"

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[str] = None


class RegisterResponse(BaseModel):
    message: str
    requires_verification: bool = True
    redirect_url: Optional[str] = None


class VerifyEmailResponse(BaseModel):
    message: str


class ResendConfirmationRequest(BaseModel):
    email: EmailStr = Field(..., max_length=255)


class ResendConfirmationResponse(BaseModel):
    message: str


class EsqueciSenhaRequest(BaseModel):
    email: EmailStr = Field(..., max_length=255)


class EsqueciSenhaResponse(BaseModel):
    message: str = "Se o e-mail estiver cadastrado, um link de recuperação foi enviado."
    redirect_url: Optional[str] = None


class RedefinirSenhaRequest(BaseModel):
    token: str = Field(..., min_length=1, max_length=2048)
    nova_senha: str = Field(..., min_length=8, max_length=128)

    @field_validator("nova_senha")
    @classmethod
    def validate_password_strength(cls, v):
        if not any(c.isupper() for c in v):
            raise ValueError("A senha deve conter pelo menos uma letra maiuscula")
        if not any(c.islower() for c in v):
            raise ValueError("A senha deve conter pelo menos uma letra minuscula")
        if not any(c.isdigit() for c in v):
            raise ValueError("A senha deve conter pelo menos um numero")
        return v


class RedefinirSenhaResponse(BaseModel):
    message: str
    redirect_url: Optional[str] = None


class AlterarSenhaRequest(BaseModel):
    nova_senha: str = Field(..., min_length=8, max_length=128)

    @field_validator("nova_senha")
    @classmethod
    def validate_password_strength(cls, v):
        if not any(c.isupper() for c in v):
            raise ValueError("A senha deve conter pelo menos uma letra maiuscula")
        if not any(c.islower() for c in v):
            raise ValueError("A senha deve conter pelo menos uma letra minuscula")
        if not any(c.isdigit() for c in v):
            raise ValueError("A senha deve conter pelo menos um numero")
        return v


class AlterarSenhaResponse(BaseModel):
    message: str
    redirect_url: Optional[str] = None


